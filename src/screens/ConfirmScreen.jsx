import CakeView from "../components/CakeView.jsx";
import Img from "../components/Img.jsx";
import Icon from "../components/Icon.jsx";
import { describeCake, MONSTERS } from "../data/ingredients.js";

export default function ConfirmScreen({ order, cake, onBack, onSubmit, busy }) {
  const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;
  return (
    <div className="screen confirm-screen">
      <div className="confirm-scroll">
        {/* 손님 + 주문 말풍선 (말줄임 없이 전문) */}
        <div className="confirm-order-row">
          <Img className="confirm-monster" src={monster.img.normal} alt={monster.name} />
          <p className="confirm-bubble stk">{order.dialogue}</p>
        </div>

        {/* 완성 케이크 — 이 화면에서 제일 크게 */}
        <div className="confirm-cake-wrap">
          <CakeView cake={cake} preview="cake" notePlacement="beside" />
        </div>

        {/* 내가 만든 것 요약 */}
        <div className="spec">
          <div className="spec-title">내가 만든 것</div>
          {describeCake(cake).map((line, i) => (
            <div key={i} className="spec-line">{line}</div>
          ))}
        </div>
      </div>

      {/* 버튼 — 하단 고정 */}
      {/* 되돌아가기는 왼쪽 동그란 화살표, 진행(주기)은 오른쪽 — 제작 화면의 ← → 배치와 같은 방향감 */}
      <div className="confirm-actions">
        <button className="btn-icon confirm-back" onClick={onBack} aria-label="다시 만들기" title="다시 만들기">
          <Icon name="retry" size="sm" />
        </button>
        <button className="btn confirm-submit" onClick={onSubmit} disabled={busy}>주기</button>
      </div>
    </div>
  );
}
