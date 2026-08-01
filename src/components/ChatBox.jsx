import { useState, useRef, useEffect } from "react";
import { chat } from "../chatClient.js";
import { MONSTERS } from "../data/ingredients.js";
import { TURN_BUDGET, TURN_PENALTY } from "../scoreCake.js";

// 손님 괴물과의 대화창. order.dialogue를 첫 대사로 시드.
// 대화 기록(history)은 이 컴포넌트가 보관하고 매 호출 시 서버로 전달(서버는 stateless).
//
// 질문 수(turns)는 App 이 들고 있다 — 점수에서 지불하는 값이라 채점까지 가야 한다.
// 예산을 다 쓰면 여기서 막는다. 스펙상 11~15턴은 코인으로 사지만 구매는 아직 미구현이라,
// 막지 않으면 11턴부터 공짜 질문이 되어버린다.
export default function ChatBox({ order, turns = 0, onAsk }) {
  const monster = MONSTERS[order.monster] ?? MONSTERS.ghost;
  const [messages, setMessages] = useState([{ id: 0, role: "monster", content: order.dialogue }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);
  const left = TURN_BUDGET - turns;
  const spent = left <= 0;
  const nextId = useRef(1); // 메시지별 안정적 key (배열 인덱스 대신)

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy || spent) return;
    const next = [...messages, { id: nextId.current++, role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    onAsk?.();
    const { reply } = await chat(order.id, next);
    setBusy(false);
    setMessages((m) => [...m, { id: nextId.current++, role: "monster", content: reply }]);
  }

  return (
    <div className="chat">
      <div className="chat-list" ref={listRef}>
        {messages.map((m) => (
          <div key={m.id} className={"bubble " + m.role}>
            {m.role === "monster" && <img className="bubble-face" src={monster.img.normal} alt="" />}
            <span className="bubble-text">{m.content}</span>
          </div>
        ))}
        {busy && <div className="bubble monster"><span className="bubble-text">…</span></div>}
      </div>
      <div className="chat-budget">
        {spent ? "질문을 다 썼어요" : `질문 ${left}번 남음 · 1번에 ${TURN_PENALTY}점`}
      </div>
      <div className="chat-input">
        <input
          type="text"
          placeholder={spent ? "더 물어보려면 코인이 필요해요" : "괴물에게 물어보기..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={busy || spent}
        />
        <button className="btn small" onClick={send} disabled={busy || spent || !input.trim()}>
          보내기
        </button>
      </div>
    </div>
  );
}
