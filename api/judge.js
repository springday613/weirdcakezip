// ─────────────────────────────────────────────────────────────
// 판정 서버리스 함수 (척추 ③) — Vercel Serverless Function
//   POST /api/judge   body: { orderId, cake, turns }
//   →    { score, made, penalty, turns, passed, stars, reaction, parts }
//
//  판정은 결정적 코드(scoreCake). LLM은 괴물 '대화'(chat.js)에서만 사용.
// ─────────────────────────────────────────────────────────────

import { orders } from "../src/data/orders.js";
import { judgeResult } from "../src/scoreCake.js";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { orderId, cake, turns } = req.body ?? {};
  const order = orders.find((o) => o.id === orderId);
  if (!order) return res.status(404).json({ error: "unknown orderId" });

  const { missing, ...result } = judgeResult(order, cake, turns);
  return res.json(result);
}
