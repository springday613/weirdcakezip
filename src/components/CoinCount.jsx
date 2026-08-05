import { useState, useEffect, useRef } from "react";

// 별점 5칸 = 0.12 × 4 + 0.36 ≈ 0.84초 → 코인은 0.84초 뒤 시작, 0.5초 동안
const DELAY_MS = 840;
const DURATION_MS = 500;

const prefersReduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ease-out: t → 1 - (1 - t)^3
function easeOut(t) {
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

// 코인 카운트업 — 정산·클리어가 같은 컴포넌트를 쓴다.
// value: 최종 표시할 숫자, delay: 카운트 시작 전 대기(ms)
export default function CoinCount({ value, delay = DELAY_MS }) {
  const [display, setDisplay] = useState(prefersReduced ? value : 0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (prefersReduced || value === 0) {
      setDisplay(value);
      return;
    }

    setDisplay(0);
    const timer = setTimeout(() => {
      const start = performance.now();

      function tick(now) {
        const elapsed = now - start;
        const t = Math.min(elapsed / DURATION_MS, 1);
        setDisplay(Math.round(easeOut(t) * value));
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, delay]);

  return <>{display.toLocaleString()}</>;
}
