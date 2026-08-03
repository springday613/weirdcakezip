import { MONSTERS } from "../data/ingredients.js";
import ChatBox from "../components/ChatBox.jsx";
import Img from "../components/Img.jsx";

// 채팅(주문) 화면 — 괴물 + 주문 카드 + 대화 + '케이크 만들기'
export default function ChatScreen({
  order,
  messages,
  onSend,
  busy,
  turns,
  extraTurns,
  money,
  onAsk,
  onBuyTurn,
  onMake,
  scriptIdx,
  onAdvanceScript,
}) {
  const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;

  return (
    <>
      <div className="layer-asset chat-monster-area">
        <Img
          src={monster.img.normal}
          className="chat-monster"
          alt={monster.name}
        />
      </div>
      <div className="layer-ui layer-ui--grow chat-ui">
        {/* 주문 카드 — 상단 고정 */}
        <div className="order-card stk">
          <span className="order-badge">주문</span>
          <p className="order-text">{order.dialogue}</p>
        </div>

        {/* 대화 영역 — ChatBox 가 턴 배지·대본·입력을 전부 렌더 */}
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

        {/* 케이크 만들기 */}
        <button className="btn-primary chat-make-btn" onClick={onMake}>
          케이크 만들기
        </button>
      </div>
    </>
  );
}
