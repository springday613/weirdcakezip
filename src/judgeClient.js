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
    // [의도적 타협] 이 폴백은 orders(=hidden.wants 포함)를 번들에 담으므로
    // DevTools로 정답을 볼 수 있다. 캐주얼 힐링 게임이라 치팅 방지보다
    // "키 없이도 끝까지 플레이" 를 우선한다. 치팅 차단이 필요해지면 이 폴백을 빼고
    // 채점을 /api/judge(서버) 전용으로 강제할 것.
    const order = orders.find((o) => o.id === orderId);
    const { score, parts, missing, passed } = scoreCake(order, cake);
    return { score, passed, parts, reaction: reactionFor(score, missing) };
  }
}
