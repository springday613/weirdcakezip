import CakeView from "../components/CakeView.jsx";
import Img from "../components/Img.jsx";
import { describeCake, MONSTERS } from "../data/ingredients.js";
import { soundManager } from "../utils/soundManager.js";

export default function ConfirmScreen({ order, cake, onBack, onSubmit, busy }) {
  const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;
  return (
    <div className="screen confirm-screen">
      <div className="confirm-scroll">
        {/* 완성 케이크 — 이 화면의 주인공이라 전폭 */}
        <div className="confirm-cake-wrap">
          <CakeView cake={cake} preview="cake" notePlacement="beside" />
        </div>

        {/* 손님 프로필 + 주문 말풍선 (QA14) — 전신 대신 작은 프로필이라 줄 높이가 확 준다.
            말줄임 없이 전문을 보여 준다 — 확인 화면의 근거라서 */}
        <div className="confirm-order-row">
          <Img className="bubble-face" src={monster.img.normal} alt={monster.name} />
          <p className="confirm-bubble stk">{order.dialogue}</p>
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
