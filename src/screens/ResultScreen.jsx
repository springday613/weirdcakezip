import { MONSTERS, moodOf } from "../data/ingredients.js";
import { starsFor, coinsFor } from "../scoreCake.js";
import CakeView from "../components/CakeView.jsx";
import Stars, { starAnimEnd } from "../components/Stars.jsx";
import CoinCount from "../components/CoinCount.jsx";
import Icon from "../components/Icon.jsx";
import Img from "../components/Img.jsx";

export default function ResultScreen({ result, order, cake, onNext, onRetry }) {
  const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;
  const mood = moodOf(result.score);
  const starValue = starsFor(result.score);

  // 질문 비용 → 별점 차이. made(감점 전) vs score(감점 후)
  const penaltyStars =
    result.penalty > 0
      ? starsFor(result.made) - starValue
      : 0;

  // 질문 비용 → 코인 차이
  const penaltyCoins =
    result.penalty > 0
      ? coinsFor(result.made) - coinsFor(result.score)
      : 0;

  // 코인 문구 — earned=0 두 원인 구분 (H12 counted 로직)
  const zeroCoinMsg =
    result.earned > 0 ? null
    : result.counted === false ? "이미 받은 손님이에요"
    : "손님이 안 사갔어요";

  return (
    <div className="screen result-screen">
      <div className="result-scroll">
        {/* 1. 괴물 (표정 3종) */}
        <Img className="result-monster" src={monster.img[mood]} alt="손님 반응" />

        {/* 2. 말풍선 — 평가가 먼저, 물건이 나중 */}
        <p className="result-bubble stk">{result.reaction}</p>

        {/* 3. 별점 */}
        <Stars value={starValue} size="md" animate />

        {/* 4. 코인 */}
        <div className="result-coin">
          <Icon name="coin" size="sm" />
          <span>
            {result.earned > 0
              ? <>+{" "}<CoinCount value={result.earned} delay={starAnimEnd(starValue)} />코인</>
              : zeroCoinMsg}
          </span>
        </div>

        {/* 5. 케이크 */}
        <div className="result-cake-wrap">
          <CakeView cake={cake} preview="cake" notePlacement="beside" />
        </div>

        {/* 6. 채점 1열 — 6항목 6줄 */}
        {result.parts && (
          <div className="result-spec stk">
            <div className="result-grid">
              {result.parts.map((p) => (
                <div
                  key={p.key}
                  className={`result-grid-item${p.frac < 0.999 ? " result-grid-item--miss" : ""}`}
                >
                  <span className="result-grid-name">{p.key}</span>
                  <span className="result-grid-status">
                    {p.frac >= 0.999 ? "완벽" : p.frac > 0 ? "조금" : "아쉬움"}
                  </span>
                  {/* 배점 = p.weight. 획득 점수(p.weight*p.frac)는 절대 표시하지 않는다 */}
                  <span className="result-grid-weight">{p.weight}</span>
                </div>
              ))}
            </div>
            {/* 대화 비용 — 별점·코인 둘 다 보여준다. 엔딩이 코인으로 갈리므로 코인 손실이 더 중요 */}
            {result.penalty > 0 && (
              <div className="result-penalty-line">
                💬 질문 {result.turns}번
                {penaltyStars > 0 && ` · 별점 ${penaltyStars}칸`}
                {penaltyCoins > 0 && ` · ${penaltyCoins}코인`}
                {penaltyStars > 0 || penaltyCoins > 0
                  ? " 깎였어요"
                  : " · 별점에는 영향 없었어요"}
              </div>
            )}
          </div>
        )}

        {result._mock && <p className="hint">※ mock 판정 (실서버 아님)</p>}
      </div>

      {/* 7. 버튼 — 하단 고정 */}
      <div className="result-actions">
        <button className="chip ghost" onClick={onRetry}>↺ 다시 플레이</button>
        <button className="btn" onClick={onNext}>다음 손님 →</button>
      </div>
    </div>
  );
}
