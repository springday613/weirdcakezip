import { useEffect, useState } from "react";
import { MONSTERS } from "../data/ingredients.js";
import ChatBox from "../components/ChatBox.jsx";
import Img from "../components/Img.jsx";

// 튜토리얼 가이드(커스터드물범) 대사 — 대본 손님(첫 주문)에서만
const GUIDE_LINES = {
  1: "괴물이 주문을 하고 있어! 첫 번째 주문에 있는 요구사항을 유심히 보자.",
  2: "그런데 좀 애매한 게 있지? 한 번 물어서 확인해 보자",
};

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

  // 가이드 단계: 0 대기(0.5초) → 1·2 물범 대사(주문만 밝게) → 3 확인 유도(대본 줄만 밝게) → null 종료
  const [guide, setGuide] = useState(order.script && scriptIdx === 0 ? 0 : null);
  useEffect(() => {
    if (guide === 0) {
      const t = setTimeout(() => setGuide(1), 500);
      return () => clearTimeout(t);
    }
  }, [guide]);
  const spotOrder = guide === 1 || guide === 2; // 주문 카드만 밝게
  const dim = (on) => (on ? " tut-dim-el" : "");

  return (
    <>
      {/* 상단(괴물~주문 카드)은 케이크 가게 안 — 아래 채팅부터는 기본 배경 */}
      <div className="chat-shop-zone">
        <div className={"layer-asset chat-monster-area" + dim(spotOrder || guide === 3)}>
          <Img
            src={monster.img.normal}
            className="chat-monster"
            alt={monster.name}
          />
        </div>
        <div className={"layer-ui chat-order-wrap" + dim(guide === 3)}>
          <div className="order-card stk">
            <span className="order-badge">주문</span>
            <p className="order-text">{order.dialogue}</p>
          </div>
        </div>
      </div>
      <div className="layer-ui layer-ui--grow chat-ui">
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
          onAdvanceScript={() => {
            if (guide != null) setGuide(null); // 첫 확인과 함께 가이드 종료
            onAdvanceScript();
          }}
          dimmed={spotOrder}
          tutFocus={guide === 3 ? "script" : null}
        />

        {/* 케이크 만들기 */}
        <button
          className={"btn-primary chat-make-btn" + dim(guide != null)}
          onClick={onMake}
        >
          케이크 만들기
        </button>
      </div>

      {/* 물범 가이드 말풍선 — 탭/≫ 로 다음 */}
      {spotOrder && (
        <div
          className="tut-guide stk"
          onClick={() => setGuide(guide === 1 ? 2 : 3)}
        >
          <span className="tut-guide-face">
            <img src="/assets/story_face_assistant.webp" alt="" />
            <span className="tut-guide-name">커스터드물범</span>
          </span>
          <p className="tut-guide-line">{GUIDE_LINES[guide]}</p>
          <span className="tut-guide-adv">≫</span>
        </div>
      )}
    </>
  );
}
