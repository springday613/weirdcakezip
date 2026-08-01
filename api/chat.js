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
    // 하이브리드 가드 — 프롬프트만으로는 none/dont-care 혼동·이름 유출이 확률적으로 남는다
    // (회귀 실측 ~25%). 서버는 정답을 아니까, 손님이 뱉은 intent 가 정답과 어긋나면
    // 어긋난 슬롯을 짚어 한 번 다시 시킨다. 재시도로도 틀리면 그대로 내보내되 표시는 남긴다.
    const system = buildMonsterSystem(order);
    const messages = toApiMessages(order, history);
    let out = parseReply(await callLLM({ system, messages, maxTokens: 400, json: true }));
    let check = checkIntent(order, out.intent);

    // 재시도는 공정성을 깨는 부류에서만 — 실제 정답이 있는 슬롯을 '상관없음/없음'으로,
    // 없어야 하는(none) 슬롯을 '상관없음'으로 잘못 아는 경우. 이때 손님이 "아무거나 괜찮아/
    // 필요 없어"라고 말해버리면 플레이어가 그 말을 믿고 만들다 감점된다.
    // 그 외(정답 미리 베끼기 등)는 대사 품질에 해가 없어 건드리지 않는다 — 넓게 재시도를
    // 걸었더니 교정 지시가 대사를 바꿔쳐 회귀가 깨졌다(실측 FAIL 3).
    const truth = answerMap(order);
    const critical = Object.keys(check ?? {}).filter((k) => {
      const got = out.intent?.[k], want = truth[k];
      const real = want !== "dont care" && want !== "none";
      return (real && (got === "dont care" || got === "none")) ||
             (want === "none" && got === "dont care");
    });

    if (critical.length || !out.intent) {
      const note = !out.intent
        ? "방금 출력이 형식을 어겼다. '출력 형식' 절의 JSON 하나로 다시 답해라. 대사 내용은 그대로."
        : `intent 의 ${critical.join(", ")} 값이 정답과 다르다. 정답 JSON 의 그 슬롯을 다시 보고 ` +
          "intent 만 바로잡아라. 대사는 원래 규칙(소거·확인·묘사)대로 방금 질문에만 답하고, " +
          "다른 슬롯 이야기를 새로 꺼내지 마라.";
      const retry = parseReply(await callLLM({
        system,
        messages: [...messages, { role: "assistant", content: out.raw ?? out.reply },
                   { role: "user", content: `(시스템 교정) ${note}` }],
        maxTokens: 400, json: true,
      }));
      const retryCheck = checkIntent(order, retry.intent);
      // 재시도가 더 낫을 때만 채택 (어긋남이 줄었거나 사라졌을 때)
      const better = retry.intent && (!retryCheck ||
        (check && Object.keys(retryCheck).length < Object.keys(check).length));
      if (better) { out = retry; check = retryCheck; out.retried = true; }
    }

    return res.json({ reply: out.reply, intent: out.intent, raw: out.raw,
                      intentCheck: check, retried: out.retried ?? false });
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
// 프롬프트를 고치면 출력 모양도 바뀐다. 실험 도구인데 파서가 그때마다 죽으면 안 되므로
// 두 모양을 다 받아 평평한 맵으로 맞춘다.
//   (가) { intent: { 슬롯: 값 } }                          — 슬롯마다 값 하나
//   (나) { known_intent, unknown_intent, dont_care/"don't care" } — 예전 3분할
// 3분할은 같은 슬롯이 두 곳에 동시에 들어갈 수 있어서(실측) 겹치면 dont care > 확인값 > unknown 순으로 정한다.
const SLOTS = ["base", "sheetColor", "toppings", "cream", "deco", "lettering"];

export function normalizeIntent(o) {
  if (o.intent && typeof o.intent === "object" && !Array.isArray(o.intent)) return o.intent;

  const pick = (v) => (Array.isArray(v) ? Object.fromEntries(v.map((k) => [k, true])) : v ?? {});
  const care = pick(o.dont_care ?? o["don't care"] ?? o.dontCare);
  const known = pick(o.known_intent);
  const unknown = pick(o.unknown_intent);
  if (![care, known, unknown].some((x) => Object.keys(x).length)) return null;

  const out = {};
  for (const k of SLOTS) {
    if (k in care) out[k] = "dont care";
    else if (k in known) out[k] = typeof known[k] === "string" ? known[k] : "unknown";
    else if (k in unknown) out[k] = "unknown";
    else out[k] = "unknown";
  }
  return out;
}

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
    return { reply: msg, intent: normalizeIntent(o), raw };
  } catch (e) {
    console.warn("[chat] 구조 파싱 실패:", e.message);
    // JSON 부스러기를 플레이어에게 그대로 보여주지 않는다. 문장만 건질 수 있으면 건지고,
    // 아니면 얼버무린다(재시도 가드가 한 번 더 기회를 준다).
    const guess = raw.match(/"monster_message"\s*:\s*"([^"]+)"/)?.[1];
    const looksJson = raw.trim().startsWith("{") || raw.trim().startsWith("[");
    return { reply: guess ?? (looksJson ? "으음… 뭐라고 말하지~" : raw || "..."), intent: null, raw: raw || null };
  }
}

// 키 없을 때: 힌트 사다리를 질문 횟수만큼 순서대로 공개(진전 보장).
function mockReply(order, history) {
  const asked = history.filter((m) => m.role === "user").length;
  const hints = order.hints ?? [];
  if (hints.length === 0) return "(mock) 으음... 잘 모르겠어.";
  return hints[Math.min(asked - 1, hints.length - 1)]; // 첫 질문 → 1단계(index 0)
}
