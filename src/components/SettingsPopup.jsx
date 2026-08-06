import { useState, useEffect, useRef } from "react";
import Icon from "./Icon.jsx";
import Img from "./Img.jsx";

// 환경설정 팝업 (S29) — HUD 햄버거로 연다.
//   아바타·이름(변경) / 효과음·음악 끄기 / 맵·첫화면으로 돌아가기
// 되돌릴 수 없는 이동은 한 번 더 묻는다 — 제작 중이면 만들던 케이크가 사라진다.
export default function SettingsPopup({
  playerName, onRename,
  sfxMuted, bgmMuted, onToggleSfx, onToggleBgm,
  canGoMap, onGoMap, onGoTitle, onClose,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(playerName);
  const [confirm, setConfirm] = useState(null); // "map" | "title" | null
  const backdropRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // 공백만 남은 이름은 저장하지 않는다 — 버튼도 함께 비활성이라 조용히 무시되지 않는다
  const saveName = () => {
    const v = draft.trim();
    if (!v) return;
    onRename(v);
    setEditing(false);
  };

  return (
    <div
      className="dim settings-backdrop"
      ref={backdropRef}
      onClick={(e) => e.target === backdropRef.current && onClose()}
    >
      <div className="settings-popup stk">
        <div className="settings-header">
          <span className="settings-title">환경 설정</span>
          <button className="btn-icon settings-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>

        {/* 프로필 — 푸딩괴물 아바타 + 이름(연필로 변경) */}
        <div className="settings-profile">
          <Img src="/assets/story_face_user.webp" className="settings-avatar" alt="내 캐릭터" />
          {editing ? (
            <>
              <input
                className="lettering-input settings-name-input"
                type="text"
                maxLength={12}
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  // Escape 는 편집만 취소한다 — window 리스너까지 가면 팝업이 통째로 닫힌다
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setDraft(playerName);
                    setEditing(false);
                  }
                }}
              />
              <button
                className="chip sm settings-name-save"
                disabled={!draft.trim()}
                onClick={saveName}
              >
                확인
              </button>
            </>
          ) : (
            <>
              <span className="settings-name">{playerName || "이름 없음"}</span>
              <button
                className="btn-icon settings-edit"
                onClick={() => { setDraft(playerName); setEditing(true); }}
                aria-label="이름 바꾸기"
              >
                ✎
              </button>
            </>
          )}
        </div>

        {/* 소리 — 끄면 아이콘에 X 가 겹친다 */}
        <div className="settings-sounds">
          <button
            className={"settings-sound stk" + (sfxMuted ? " off" : "")}
            onClick={onToggleSfx}
            aria-pressed={!sfxMuted}
            aria-label="효과음"
          >
            <Icon name="sound-on" size="md" />
            <span className="settings-sound-label">효과음</span>
          </button>
          <button
            className={"settings-sound stk" + (bgmMuted ? " off" : "")}
            onClick={onToggleBgm}
            aria-pressed={!bgmMuted}
            aria-label="음악"
          >
            <Icon name="music" size="md" />
            <span className="settings-sound-label">음악</span>
          </button>
        </div>

        {/* 이동 — 되돌릴 수 없으니 한 번 더 묻는다 */}
        <div className="settings-actions">
          {canGoMap && (
            confirm === "map" ? (
              <div className="settings-confirm">
                <span>만들던 케이크는 사라져요. 나갈까요?</span>
                <button className="btn small" onClick={onGoMap}>맵으로</button>
                <button className="chip ghost sm" onClick={() => setConfirm(null)}>취소</button>
              </div>
            ) : (
              <button className="btn-ghost settings-item" onClick={() => setConfirm("map")}>
                맵으로 돌아가기
              </button>
            )
          )}
          {confirm === "title" ? (
            <div className="settings-confirm">
              <span>코인·별점이 모두 사라져요. 처음부터 할까요?</span>
              <button className="btn small" onClick={onGoTitle}>첫화면으로</button>
              <button className="chip ghost sm" onClick={() => setConfirm(null)}>취소</button>
            </div>
          ) : (
            <button className="btn-ghost settings-item" onClick={() => setConfirm("title")}>
              첫화면으로 돌아가기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
