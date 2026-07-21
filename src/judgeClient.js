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
    // [임시·디버깅용] 서버 없이(순수 vite dev) 즉시 채점·디버깅하려는 폴백.
    // 단점: orders(=hidden.wants 정답 포함)가 번들에 담겨 DevTools로 정답이 보인다.
    // TODO: 제출/배포 전 이 폴백 제거 → 채점을 /api/judge(서버) 전용으로 강제 (정답 노출 차단).
    const order = orders.find((o) => o.id === orderId);
    const { score, parts, missing, passed } = scoreCake(order, cake);
    return { score, passed, parts, reaction: reactionFor(score, missing) };
  }
}
