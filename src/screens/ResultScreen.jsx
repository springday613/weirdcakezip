import { MONSTERS, moodOf } from "../data/ingredients.js";
import { starsFor, coinsFor } from "../scoreCake.js";
import CakeView from "../components/CakeView.jsx";
import Stars, { starAnimEnd } from "../components/Stars.jsx";
import CoinCount from "../components/CoinCount.jsx";
import Icon from "../components/Icon.jsx";
import Img from "../components/Img.jsx";

export default function ResultScreen({ result, order, cake, onNext, onMap, onRetry, lastRound = false }) {
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
        {/* 1. 케이크 — 결과 화면의 주인공 (QA14) */}
        <div className="result-cake-wrap">
          <CakeView cake={cake} preview="cake" notePlacement="beside" />
        </div>

        {/* 2. 별점 */}
        <Stars value={starValue} size="md" animate />

        {/* 3. 코인 */}
        <div className="result-coin">
          <Icon name="coin" size="sm" />
          <span>
            {result.earned > 0 ? (
              <>+{" "}<CoinCount value={result.earned} delay={starAnimEnd(starValue)} />코인</>
            ) : (
              /* 0 을 먼저 보여 주고 이유를 옆에 — 코인 줄의 자리(숫자)가 항상 같게 (QA14) */
              <>0<span className="result-coin-why">{zeroCoinMsg}</span></>
            )}
          </span>
        </div>

        {/* 4. 손님 프로필 + 반응 말풍선 — 케이크·점수를 본 뒤에 손님 반응 (QA14).
            전신을 세우면 세로를 크게 먹어 프로필로 줄였다(표정 3종은 그대로 드러난다) */}
        <div className="result-speaker">
          <Img className="bubble-face" src={monster.img[mood]} alt="손님 반응" />
          <p className="result-bubble stk">{result.reaction}</p>
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
      {/* 다음 손님은 맵을 거치지 않고 바로 다음 라운드로 — 맵은 따로 볼 수 있게 남긴다 (S33) */}
      <div className="result-actions">
        {/* 되돌아가기 아이콘은 ConfirmScreen 의 '다시 만들기' 와 같은 것을 쓴다 — ↺ 글자를 쓰면 화살표가 반대로 돈다 */}
        <button className="btn-ghost result-action" onClick={onRetry}>
          <Icon name="retry" size="sm" /> 다시하기
        </button>
        {onMap && <button className="btn-ghost result-action" onClick={onMap}>맵으로</button>}
        <button className="btn result-action" onClick={onNext}>
          {lastRound ? "엔딩 보기 →" : "다음 손님 →"}
        </button>
      </div>
    </div>
  );
}
