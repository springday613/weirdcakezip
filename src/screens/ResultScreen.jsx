import { describeCake } from "../data/ingredients.js";

export default function ResultScreen({ result, order, cake, onNext }) {
  const good = result.passed;
  return (
    <div className="screen center">
      <h1>{good ? "🎉 만족!" : "🤔 애매해요"}</h1>
      <div className="score-ring" data-good={good}>
        {result.score}
        <span className="score-unit">점</span>
      </div>
      <p className="reaction">{result.reaction}</p>

      {result.parts && (
        <div className="spec">
          <div className="spec-title">📊 채점 내역</div>
          {result.parts.map((p) => (
            <div key={p.key} className="spec-line">
              {p.frac >= 0.999 ? "✅" : p.frac > 0 ? "🔸" : "❌"} {p.key}{" "}
              <span className="muted">
                {Math.round(p.weight * p.frac)}/{p.weight}점
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="spec">
        <div className="spec-title">🎂 내가 만든 것</div>
        {describeCake(cake).map((line, i) => (
          <div key={i} className="spec-line">{line}</div>
        ))}
      </div>

      <details className="reveal">
        <summary>손님의 진짜 마음은?</summary>
        <p>{order.hidden.intent}</p>
      </details>

      {result._mock && <p className="hint">※ mock 판정 (실서버 아님)</p>}

      <button className="btn" onClick={onNext}>
        다음 손님 ▶
      </button>
    </div>
  );
}
