import { MONSTERS, moodOf } from "../data/ingredients.js";
import { answerMap, starsFor } from "../scoreCake.js";
import { SCORE_LABELS } from "../data/scoreLabels.js";
import CakeView from "../components/CakeView.jsx";
import Stars from "../components/Stars.jsx";
import Icon from "../components/Icon.jsx";

export default function ResultScreen({ result, order, cake, onNext, onRetry }) {
  const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;
  const mood = moodOf(result.score);
  const starValue = starsFor(result.score);

  // 질문 비용 → 별점 차이. starsFor(점수+감점) - starsFor(점수) = 잃은 칸 수
  const penaltyStars =
    result.penalty > 0
      ? starsFor(result.score + result.penalty) - starValue
      : 0;

  // 코인 문구 — earned=0 두 원인 구분 (H12 counted 로직)
  let coinMsg;
  if (result.earned > 0) {
    coinMsg = `+${result.earned.toLocaleString()}코인`;
  } else if (result.counted === false) {
    coinMsg = "이미 받은 손님이에요";
  } else {
    coinMsg = "손님이 안 사갔어요";
  }

  return (
    <div className="screen result-screen">
      {/* 1. 괴물 (표정 3종 — mood 로 선택) */}
      <img className="result-monster" src={monster.img[mood]} alt="손님 반응" />

      {/* 2. 말풍선 — 괴물이 말하고 그 대상이 아래 케이크 */}
      <p className="result-bubble stk">{result.reaction}</p>

      {/* 3. 케이크 — 괴물보다 크게 */}
      <div className="result-cake-wrap">
        <CakeView cake={cake} preview="cake" notePlacement="beside" />
      </div>

      {/* 4. 손님 만족도 라벨 + 별점 */}
      <span className="result-sat-label">손님 만족도</span>
      <Stars value={starValue} size="md" />

      {/* 5. 코인 배지 */}
      <div className="result-coin">
        <Icon name="coin" size="sm" />
        <span>{coinMsg}</span>
      </div>

      {/* 6. 채점 2열 그리드 — 6항목 3줄 */}
      {result.parts && (
        <div className="result-spec stk">
          <div className="result-grid">
            {result.parts.map((p) => (
              <div
                key={p.key}
                className={`result-grid-item${p.frac < 0.999 ? " result-grid-item--miss" : ""}`}
              >
                <span className="result-grid-name">{SCORE_LABELS[p.key] ?? p.key}</span>
                <span className="result-grid-status">
                  {p.frac >= 0.999 ? "완벽" : p.frac > 0 ? "조금" : "아쉬움"}
                </span>
                {/* 배점 = p.weight. 획득 점수(p.weight*p.frac)는 절대 표시하지 않는다 */}
                <span className="result-grid-weight">{p.weight}</span>
              </div>
            ))}
          </div>
          {/* 대화 비용 — 안 보여주면 "다 맞았는데 왜 별점이?" 가 된다(실플레이 제보) */}
          {result.penalty > 0 && (
            <div className="result-penalty-line">
              💬 질문 {result.turns}번{" "}
              {penaltyStars > 0
                ? `· 별점이 ${penaltyStars}칸 깎였어요`
                : "· 별점에는 영향 없었어요"}
            </div>
          )}
        </div>
      )}

      {/* 손님의 진짜 마음은? — 채점 검증용. 프로덕션에서는 표시하지 않는다 (D-24) */}
      {import.meta.env.DEV && (
        <details className="reveal">
          <summary>손님의 진짜 마음은?</summary>
          <pre className="reveal-intent">{JSON.stringify(answerMap(order), null, 2)}</pre>
          <p className="reveal-legend">
            <code>"dont care"</code> 상관없음 · <code>"none"</code> 없어야 함 · 그 외는 그 값이 정답
          </p>
        </details>
      )}

      {result._mock && <p className="hint">※ mock 판정 (실서버 아님)</p>}

      {/* 7. 버튼 */}
      <div className="result-actions">
        <button className="chip ghost" onClick={onRetry}>↺ 다시 플레이</button>
        <button className="btn" onClick={onNext}>다음 손님 →</button>
      </div>
    </div>
  );
}
