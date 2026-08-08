import { orders } from "../data/orders.js";
import { MONSTERS } from "../data/ingredients.js";
import Stars, { starAnimEnd } from "../components/Stars.jsx";
import CoinCount from "../components/CoinCount.jsx";

export default function StageClearScreen({ stars, money, onEnding, onRestart }) {
  const totalStars = stars.reduce((s, v) => s + v, 0);
  const maxStars = orders.length * 5;

  return (
    <div className="screen clear-screen">
      <div className="clear-scroll">
        <div className="receipt stk">
          <h1 className="receipt-title">영업 종료</h1>
          <p className="receipt-subtitle">뭉게뭉게 마을 · 1일차</p>

          <div className="receipt-rule" />

          {orders.map((order, i) => {
            const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;
            return (
              <div key={order.id} className="receipt-row">
                <span>{monster.name}</span>
                <Stars value={stars[i] ?? 0} animate />
              </div>
            );
          })}

          <div className="receipt-rule" />

          <div className="receipt-row receipt-total">
            <span>합계</span>
            <span>★ {totalStars} / {maxStars}</span>
          </div>
          <div className="receipt-row receipt-total">
            <span>매출</span>
            <span><CoinCount value={money} delay={starAnimEnd(Math.max(...stars, 0))} />코인</span>
          </div>

          <p className="receipt-note">오늘도 수고했어요</p>
        </div>
      </div>

      {/* 버튼 — 하단 고정 */}
      <div className="clear-actions">
        <button className="chip ghost" onClick={onRestart}>다시하기</button>
        <button className="btn" onMouseDown={onEnding} onTouchStart={onEnding}>엔딩 보기</button>
      </div>
    </div>
  );
}
