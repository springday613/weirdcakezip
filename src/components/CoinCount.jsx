import { useState, useEffect, useRef } from "react";
import { starAnimEnd } from "./Stars.jsx";

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
export default function CoinCount({ value, delay = starAnimEnd(5) }) {
  // value>0 일 때 초기값 1 — 딜레이 동안 '0코인'이 보이지 않도록
  const [display, setDisplay] = useState(
    prefersReduced ? value : (value > 0 ? 1 : 0),
  );
  const rafRef = useRef(null);

  useEffect(() => {
    if (prefersReduced || value === 0) {
      setDisplay(value);
      return;
    }

    setDisplay(1);
    const timer = setTimeout(() => {
      const start = performance.now();

      function tick(now) {
        const elapsed = now - start;
        const t = Math.min(elapsed / DURATION_MS, 1);
        setDisplay(Math.max(1, Math.round(easeOut(t) * value)));
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
