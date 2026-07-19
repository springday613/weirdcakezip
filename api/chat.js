// ─────────────────────────────────────────────────────────────
// 손님 괴물과의 대화 (런타임 LLM) — Vercel Serverless Function
//
//   POST /api/chat   body: { orderId, history: [{role:"user"|"monster", content}] }
//   →    { reply: "<괴물의 다음 대사>" }
// ─────────────────────────────────────────────────────────────

import { orders } from "../src/data/orders.js";
import { buildMonsterSystem, toApiMessages } from "./_monsterPrompt.js";
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
      maxTokens: 150,
    });
    return res.json({ reply: text?.trim() || "..." });
  } catch (e) {
    console.error("[chat] error:", e);
    return res.status(500).json({ error: "chat failed", detail: String(e) });
  }
}

// 키 없을 때: 힌트 사다리를 질문 횟수만큼 순서대로 공개(진전 보장).
function mockReply(order, history) {
  const asked = history.filter((m) => m.role === "user").length;
  const hints = order.hints ?? [];
  if (hints.length === 0) return "(mock) 으음... 잘 모르겠어.";
  return hints[Math.min(asked - 1, hints.length - 1)]; // 첫 질문 → 1단계(index 0)
}
