import Icon from "./Icon.jsx";

/**
 * 상단 HUD — (왼쪽 슬롯) ... (오른쪽: 코인 · 음소거 · 메뉴)
 *
 * children 이 있으면 왼쪽에 렌더한다 (예: 대화 열기 버튼).
 * hearts 가 없으면 하트 pill 을 렌더하지 않는다.
 */
export default function Hud({ hearts, coins = 0, muted, onToggleMute, children }) {
  return (
    <div className="hud-bar">
      {children}

      {hearts != null && (
        <div className="hud-pill">
          <Icon name="heart" size="sm" />
          <span>{hearts}</span>
        </div>
      )}

      <div className="hud-spacer" />

      <div className="hud-pill">
        <Icon name="coin" size="sm" />
        <span>{coins.toLocaleString()}코인</span>
      </div>

      <button className="btn-icon" aria-label={muted ? "소리 켜기" : "소리 끄기"} onClick={onToggleMute}>
        <Icon name={muted ? "sound-off" : "sound-on"} size="sm" />
      </button>

      <button className="btn-icon" aria-label="메뉴">
        <Icon name="menu" size="sm" />
      </button>
    </div>
  );
}
