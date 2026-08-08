import Icon from "./Icon.jsx";

/**
 * 상단 HUD — (왼쪽 슬롯) ... (오른쪽: 코인 · 메뉴)
 *
 * children 은 왼쪽 슬롯에 렌더한다 (예: 대화 열기 버튼).
 * hearts 가 없으면 하트 pill 을 렌더하지 않는다.
 * 소리 토글은 메뉴(환경설정) 안으로 옮겼다 — 효과음·음악을 따로 끄기 때문 (S29).
 * 아바타(푸딩괴물)는 제거 (S34) — 프로필은 메뉴(환경설정) 안에서만 보여 준다.
 */
export default function Hud({ hearts, coins = 0, onOpenMenu, children }) {
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

      <button className="btn-icon" aria-label="메뉴" onClick={onOpenMenu}>
        <Icon name="menu" size="sm" />
      </button>
    </div>
  );
}
