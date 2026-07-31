import Icon from "./Icon.jsx";

/**
 * 상단 HUD — 하트 · 코인 · 메뉴
 *
 * [♡ pill][ 4 ]   [◉ pill][ 1,308원 ]        [≡]
 *
 * props: hearts, coins (상태 연결은 화면 구현 단계에서)
 */
export default function Hud({ hearts = 5, coins = 0 }) {
  return (
    <div className="hud-bar">
      <div className="hud-pill">
        <Icon name="heart" size="sm" />
        <span>{hearts}</span>
      </div>

      <div className="hud-pill">
        <Icon name="coin" size="sm" />
        <span>{coins.toLocaleString()}원</span>
      </div>

      <div className="hud-spacer" />

      <button className="btn-icon" aria-label="메뉴">
        <Icon name="menu" size="sm" />
      </button>
    </div>
  );
}
