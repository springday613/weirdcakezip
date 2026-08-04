import { describeCake, MONSTERS, moodOf } from "../data/ingredients.js";
import { answerMap, starsFor } from "../scoreCake.js";
import { SCORE_LABELS } from "../data/scoreLabels.js";
import CakeView from "../components/CakeView.jsx";
import Stars from "../components/Stars.jsx";

export default function ResultScreen({ result, order, cake, onNext, onRetry }) {
  const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;
  const mood = moodOf(result.score);
  const starValue = starsFor(result.score);

  // 질문 비용을 별점 기준으로 표현 — starsFor(점수+감점) - starsFor(점수) = 잃은 칸 수
  const penaltyStars =
    result.penalty > 0
      ? starsFor(result.score + result.penalty) - starValue
      : 0;

  // 코인 문구 — earned=0 의 두 가지 이유를 구분
  let coinMsg;
  if (result.earned > 0) {
    coinMsg = `+${result.earned.toLocaleString()}코인 벌었어요!`;
  } else if (result.counted === false) {
    // 재플레이 — isReplay 였으므로 counted=false (H12 로직)
    coinMsg = "이미 받은 손님이에요";
  } else {
    // 첫 플레이인데 통과선 미달
    coinMsg = "손님이 안 사갔어요";
  }

  return (
    <div className="screen result-screen">
      {/* 스크롤 영역 — 내용이 길어서 스크롤 허용. 버튼은 아래 고정 */}
      <div className="result-scroll">
        <div className="result-top">
          <img className="monster-big" src={monster.img[mood]} alt="손님 반응" />
          <Stars value={starValue} size="md" />
        </div>

        <p className="reaction">{result.reaction}</p>

        <CakeView cake={cake} preview="cake" notePlacement="beside" />

        <p className="earned">{coinMsg}</p>

        {result.parts && (
          <div className="spec">
            <div className="spec-title">채점 내역</div>
            {result.parts.map((p) => (
              <div key={p.key} className="spec-line">
                {p.frac >= 0.999 ? "✅" : p.frac > 0 ? "🔸" : "❌"}{" "}
                {SCORE_LABELS[p.key] ?? p.key}
              </div>
            ))}
            {/* 대화 비용 — 안 보여주면 "다 맞았는데 왜 별점이?" 가 된다(실플레이 제보) */}
            {result.penalty > 0 && (
              <div className="spec-line result-penalty">
                💬 질문 {result.turns}번{" "}
                {penaltyStars > 0
                  ? `· 별점이 ${penaltyStars}칸 깎였어요`
                  : "· 별점에는 영향 없었어요"}
              </div>
            )}
          </div>
        )}

        <div className="spec">
          <div className="spec-title">내가 만든 것</div>
          {describeCake(cake).map((line, i) => (
            <div key={i} className="spec-line">{line}</div>
          ))}
        </div>

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
      </div>

      {/* 버튼 — 하단 고정 */}
      <div className="result-actions">
        <button className="btn" onClick={onNext}>
          다음 손님
        </button>
        <button className="chip ghost" onClick={onRetry}>다시하기</button>
      </div>
    </div>
  );
}
