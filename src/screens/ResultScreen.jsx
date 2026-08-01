import { describeCake, MONSTERS, moodOf } from "../data/ingredients.js";
import CakeView from "../components/CakeView.jsx";

export default function ResultScreen({ result, order, cake, onNext }) {
  const good = result.passed;
  const monster = MONSTERS[order.monster] ?? MONSTERS.ghost;
  const mood = moodOf(result.score);
  const label = mood === "happy" ? "만족!" : mood === "sad" ? "이상해요" : "애매해요";
  return (
    <div className="screen center">
      <div className="result-label">{label}</div>
      <CakeView cake={cake} preview="cake" />
      <div className="result-row">
        <img className="monster-big" src={monster.img[mood]} alt="손님 반응" />
        <div className="score-ring" data-good={good}>
          {result.score}
          <span className="score-unit">점</span>
        </div>
      </div>
      <p className="reaction">{result.reaction}</p>
      {result.earned != null && (
        <p className="earned">+{result.earned.toLocaleString()}코인 벌었어요!</p>
      )}

      {result.parts && (
        <div className="spec">
          <div className="spec-title">채점 내역</div>
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
        <div className="spec-title">내가 만든 것</div>
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
        다음 손님
      </button>
    </div>
  );
}
