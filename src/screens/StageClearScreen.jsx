import { orders } from "../data/orders.js";
import { MONSTERS } from "../data/ingredients.js";
import Img from "../components/Img.jsx";
import Stars from "../components/Stars.jsx";
import CoinCount from "../components/CoinCount.jsx";

export default function StageClearScreen({ stars, money, onEnding, onRestart }) {
  const totalStars = stars.reduce((s, v) => s + v, 0);
  const maxStars = orders.length * 5;

  return (
    <div className="screen clear-screen">
      <div className="clear-scroll">
        <h1 className="clear-title">영업 종료</h1>

        {/* 손님별 별점 5줄 */}
        <div className="clear-customers">
          {orders.map((order, i) => {
            const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;
            return (
              <div key={order.id} className="clear-customer-row stk">
                <Img
                  className="clear-monster-face"
                  src={monster.img.normal}
                  alt={monster.name}
                />
                <span className="clear-monster-name">{monster.name}</span>
                <Stars value={stars[i] ?? 0} animate />
              </div>
            );
          })}
        </div>

        {/* 총 별점 + 총 매출 */}
        <div className="clear-summary stk">
          <p className="clear-total-stars">★ {totalStars} / {maxStars}</p>
          {/* 코인은 플레이어가 쓰는 자원 — 숫자로 표시. 점수(totalScore)는 표시하지 않는다 */}
          <p className="clear-money big"><CoinCount value={money} />코인</p>
        </div>
      </div>

      {/* 버튼 — 하단 고정 */}
      <div className="clear-actions">
        <button className="btn" onClick={onEnding}>엔딩 보기</button>
        <button className="chip ghost" onClick={onRestart}>다시하기</button>
      </div>
    </div>
  );
}
