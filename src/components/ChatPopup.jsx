import { useEffect, useRef } from "react";
import { MONSTERS } from "../data/ingredients.js";
import ChatBox from "./ChatBox.jsx";
import Img from "./Img.jsx";

// 제작 중 대화 팝업 — ChatBox 를 전체 화면과 공유한다 (복제 금지)
export default function ChatPopup({
  order,
  messages,
  onSend,
  busy,
  turns,
  extraTurns,
  money,
  onAsk,
  onBuyTurn,
  onClose,
  scriptIdx,
  onAdvanceScript,
}) {
  const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;
  const backdropRef = useRef(null);

  // Esc 로 닫기
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // 팝업 밖 클릭으로 닫기
  function handleBackdropClick(e) {
    if (e.target === backdropRef.current) onClose();
  }

  return (
    <div className="dim chat-popup-backdrop" ref={backdropRef} onClick={handleBackdropClick}>
      <div className="chat-popup stk">
        {/* 상단: 괴물 얼굴 + 이름 + 닫기 */}
        <div className="chat-popup-header">
          <Img src={monster.img.normal} className="chat-popup-face" alt="" />
          <span className="chat-popup-name">{monster.name}</span>
          <button className="btn-icon chat-popup-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>

        {/* 주문 카드 축약 */}
        <div className="order-card order-card--compact stk">
          <span className="order-badge">주문</span>
          <p className="order-text">{order.dialogue}</p>
        </div>

        {/* 대화 — 전체 화면과 같은 ChatBox, 같은 props */}
        <ChatBox
          order={order}
          messages={messages}
          onSend={onSend}
          busy={busy}
          turns={turns}
          extraTurns={extraTurns}
          money={money}
          onAsk={onAsk}
          onBuyTurn={onBuyTurn}
          scriptIdx={scriptIdx}
          onAdvanceScript={onAdvanceScript}
        />

        <button className="btn-ghost chat-popup-done" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
