// 괴물과의 대화 API 호출 래퍼 (+ 로컬 mock 폴백)
// 로컬 `npm run dev`엔 /api/chat이 없으므로 실패 시 힌트 사다리 mock으로 폴백.

import { orders } from "./data/orders.js";

export async function chat(orderId, history) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, history }),
    });
    if (!res.ok) throw new Error("chat api not ok: " + res.status);
    return await res.json();
  } catch (e) {
    console.warn("[chatClient] 서버 호출 실패 → 로컬 mock:", e.message);
    return { reply: mockReply(orderId, history), _mock: true };
  }
}

// 서버 mock과 동일 규칙: 질문 횟수만큼 힌트 사다리를 순서대로 공개(진전 보장).
function mockReply(orderId, history) {
  const order = orders.find((o) => o.id === orderId);
  const hints = order?.hints ?? [];
  if (hints.length === 0) return "(mock) 으음... 잘 모르겠어.";
  const asked = history.filter((m) => m.role === "user").length;
  return hints[Math.min(asked - 1, hints.length - 1)]; // 첫 질문 → 1단계(index 0)
}
