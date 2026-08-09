import CakeView from "../components/CakeView.jsx";
import Img from "../components/Img.jsx";
import { describeCake, MONSTERS } from "../data/ingredients.js";
import { soundManager } from "../utils/soundManager.js";

export default function ConfirmScreen({ order, cake, onBack, onSubmit, busy }) {
  const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;
  return (
    <div className="screen confirm-screen">
      <div className="confirm-scroll">
        {/* 손님과 완성 케이크를 나란히 — '이 손님에게 이 케이크를' 이라는 그림 (QA14).
            케이크는 236px 고정이라 손님(72)+간격을 붙여도 가용 폭(351) 안에 들어간다 —
            세로로 쌓던 두 줄이 한 줄이 되어 그만큼 화면이 짧아진다. */}
        <div className="confirm-hero">
          <Img className="confirm-monster" src={monster.img.normal} alt={monster.name} />
          <div className="confirm-cake-wrap">
            <CakeView cake={cake} preview="cake" notePlacement="beside" />
          </div>
        </div>

        {/* 주문 전문 — 확인 화면의 근거라 말줄임 없이 (폭이 넓어져 줄 수가 준다) */}
        <p className="confirm-bubble stk">{order.dialogue}</p>

        {/* 내가 만든 것 요약 */}
        <div className="spec">
          <div className="spec-title">내가 만든 것</div>
          {describeCake(cake).map((line, i) => (
            <div key={i} className="spec-line">{line}</div>
          ))}
        </div>
      </div>

      {/* 버튼 — 하단 고정 */}
      {/* 고치기(만들던 상태로 복귀)는 왼쪽 동그란 화살표, 진행(주기)은 오른쪽 — 제작 화면의 ← → 배치와 같은 방향감 */}
      <div className="confirm-actions">
        <button className="btn-ghost confirm-back" data-sfx="back" onMouseDown={() => soundManager.playSfx("back")} onTouchStart={() => soundManager.playSfx("back")} onClick={onBack}>
          고치기
        </button>
        {/* 주기의 tap 사운드는 H16 것 — data-sfx 가 있으면 App 의 전역 위임 tap 은 건너뛴다 */}
        <button
          className="btn confirm-submit"
          data-sfx="tap"
          onMouseDown={() => soundManager.playSfx("tap")}
          onTouchStart={() => soundManager.playSfx("tap")}
          onClick={onSubmit}
          disabled={busy}
        >
          주기
        </button>
      </div>
    </div>
  );
}
