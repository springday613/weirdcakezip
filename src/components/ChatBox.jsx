import { useState, useRef, useEffect } from "react";
import { chat } from "../chatClient.js";
import { MONSTERS } from "../data/ingredients.js";

// 손님 괴물과의 대화창. order.dialogue를 첫 대사로 시드.
// 대화 기록(history)은 이 컴포넌트가 보관하고 매 호출 시 서버로 전달(서버는 stateless).
export default function ChatBox({ order }) {
  const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;
  const [messages, setMessages] = useState([{ id: 0, role: "monster", content: order.dialogue }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);
  const nextId = useRef(1); // 메시지별 안정적 key (배열 인덱스 대신)

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { id: nextId.current++, role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
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
      <div className="chat-input">
        <input
          type="text"
          placeholder="괴물에게 물어보기..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={busy}
        />
        <button className="btn small" onClick={send} disabled={busy || !input.trim()}>
          보내기
        </button>
      </div>
    </div>
  );
}
