import { useState } from "react";
import Img from "../components/Img.jsx";
import { randomTip } from "../data/tips.js";

// 로딩 오버레이 — 화면 위에 얹는다 (뒤 화면 언마운트 방지).
// useLoading() 훅이 최소 표시 시간(800ms)을 보장한다.
const MIN_MS = 1800;

export default function LoadingScreen({ visible, message = "준비 중…", img, silhouette = false }) {
  const [tip] = useState(() => randomTip());

  if (!visible) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <Img
          src={img || "/assets/pink.webp"}
          className={"loading-monster" + (silhouette ? " loading-monster--shadow" : "")}
          alt=""
        />
        <p className="loading-message">{message}</p>
        <div className="loading-dots">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
        </div>
        <div className="loading-bar">
          <div className="loading-bar-fill" />
        </div>
        <div className="loading-tip stk">
          <span className="loading-tip-badge">TIP</span>
          <p className="loading-tip-line">{tip[0]}</p>
          <p className="loading-tip-line">{tip[1]}</p>
        </div>
      </div>
    </div>
  );
}

// 편의 훅 — 로딩 오버레이를 제어한다
export function useLoading() {
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("준비 중…");
  // 이 로딩이 보여줄 손님 그림 — 실루엣 여부까지 한 묶음 (QA17 / KAN-67)
  const [loadArt, setLoadArt] = useState({ img: null, silhouette: false });

  // 로딩 시작 + 비동기 작업 래핑. 최소 MIN_MS 동안 표시.
  // asyncFn 이 예외를 던져도 finally 에서 오버레이를 반드시 닫는다. 에러는 호출부로 재전파.
  async function withLoading(msg, asyncFn, art = {}) {
    setLoadMsg(msg);
    setLoadArt({ img: art.img ?? null, silhouette: !!art.silhouette });
    setLoading(true);
    const start = Date.now();
    try {
      return await asyncFn();
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_MS) {
        await new Promise((r) => setTimeout(r, MIN_MS - elapsed));
      }
      setLoading(false);
    }
  }

  return { loading, loadMsg, loadArt, setLoading, withLoading };
}
