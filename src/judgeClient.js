// 판정 호출 래퍼 — 판정은 결정적 코드라 서버 없이도 동일 결과(로컬 계산 폴백).
import { orders } from "./data/orders.js";
import { scoreCake, reactionFor } from "./scoreCake.js";

export async function judge(orderId, cake) {
  try {
    const res = await fetch("/api/judge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, cake }),
    });
    if (!res.ok) throw new Error("judge api not ok: " + res.status);
    return await res.json();
  } catch {
    // 서버가 없어도(순수 vite dev) 동일한 결정적 채점을 로컬에서 수행.
    const order = orders.find((o) => o.id === orderId);
    const { score, parts, missing, passed } = scoreCake(order, cake);
    return { score, passed, parts, reaction: reactionFor(score, missing) };
  }
}
