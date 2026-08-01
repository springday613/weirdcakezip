// ─────────────────────────────────────────────────────────────
// 손님 괴물과의 대화 (런타임 LLM) — Vercel Serverless Function
//
//   POST /api/chat   body: { orderId, history: [{role:"user"|"monster", content}] }
//   →    { reply: "<괴물의 다음 대사>" }
// ─────────────────────────────────────────────────────────────

import { orders } from "../src/data/orders.js";
import { buildMonsterSystem, toApiMessages, answerMap } from "./_monsterPrompt.js";
import { callLLM, hasLLM } from "./_llm.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { orderId, history = [] } = req.body ?? {};
  const order = orders.find((o) => o.id === orderId);
  if (!order) return res.status(404).json({ error: "unknown orderId" });

  if (process.env.MOCK_CHAT === "1" || !hasLLM()) {
    return res.json({ reply: mockReply(order, history), _mock: true });
  }

  try {
    const text = await callLLM({
      system: buildMonsterSystem(order),
      messages: toApiMessages(order, history),
      maxTokens: 400,
      json: true,
    });
    const { reply, intent, raw } = parseReply(text);
    return res.json({ reply, intent, raw, intentCheck: checkIntent(order, intent) });
  } catch (e) {
    console.error("[chat] error:", e);
    return res.status(500).json({ error: "chat failed", detail: String(e) });
  }
}

// 손님은 대사와 함께 '지금까지 뭘 알려줬는지'를 구조로 뱉는다.
// 그래야 (1) 이미 확인해준 걸 다시 소거 퍼즐로 돌리지 않고 (2) don't-care 슬롯에 답을
// 지어내지 않으며 (3) 회귀 테스트가 말투 키워드 대신 상태를 단언할 수 있다.
//
// JSON 이 깨져도 대화는 끊기지 않아야 한다 → 파싱 실패 시 원문을 대사로 쓴다.
// 정답은 서버가 안다 → 모델이 적은 intent 를 대조해 어긋난 슬롯을 짚는다.
// 대화를 막지는 않는다(연출은 살린다). 콘솔·회귀 테스트가 이걸 보고 판단한다.
export function checkIntent(order, intent) {
  if (!intent) return null;
  const truth = answerMap(order);
  const bad = {};
  for (const [k, want] of Object.entries(truth)) {
    const got = intent[k];
    if (got === undefined) { bad[k] = `빠짐 (정답 ${want})`; continue; }
    if (got === "unknown") { if (want === "dont care") bad[k] = "상관없는 슬롯인데 unknown"; continue; }
    if (got !== want) bad[k] = `${got} → 정답은 ${want}`;
  }
  return Object.keys(bad).length ? bad : null;
}

export function parseReply(text) {
  const raw = (text ?? "").trim();
  try {
    const o = JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim());
    const msg = String(o.monster_message ?? "").trim();
    if (!msg) throw new Error("monster_message 없음");
    // 슬롯마다 값이 정확히 하나 — 상관없음/미확인/확인됨이 서로 겹칠 수 없다.
    // (앞서 known/unknown/dont_care 를 따로 두었더니 같은 슬롯이 두 곳에 동시에 들어갔다)
    return { reply: msg, intent: o.intent ?? null, raw };
  } catch (e) {
    console.warn("[chat] 구조 파싱 실패 — 원문을 대사로 쓴다:", e.message);
    return { reply: raw || "...", intent: null, raw: null };
  }
}

// 키 없을 때: 힌트 사다리를 질문 횟수만큼 순서대로 공개(진전 보장).
function mockReply(order, history) {
  const asked = history.filter((m) => m.role === "user").length;
  const hints = order.hints ?? [];
  if (hints.length === 0) return "(mock) 으음... 잘 모르겠어.";
  return hints[Math.min(asked - 1, hints.length - 1)]; // 첫 질문 → 1단계(index 0)
}
