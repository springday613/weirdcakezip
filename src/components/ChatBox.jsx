import { useState, useRef, useEffect } from "react";
import { chat } from "../chatClient.js";
import { MONSTERS } from "../data/ingredients.js";
import { TURN_BUDGET, TURN_PENALTY, EXTRA_TURN_BUNDLE, extraTurnPrice } from "../scoreCake.js";

// 손님 괴물과의 대화창. order.dialogue를 첫 대사로 시드.
// 대화 기록(history)은 이 컴포넌트가 보관하고 매 호출 시 서버로 전달(서버는 stateless).
//
// 질문 수(turns)는 App 이 들고 있다 — 점수에서 지불하는 값이라 채점까지 가야 한다.
// 예산을 다 쓰면 여기서 막는다. 스펙상 11~15턴은 코인으로 사지만 구매는 아직 미구현이라,
// 막지 않으면 11턴부터 공짜 질문이 되어버린다.
export default function ChatBox({ order, turns = 0, extraTurns = 0, money = 0, onAsk, onBuyTurn }) {
  const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;
  const [messages, setMessages] = useState([{ id: 0, role: "monster", content: order.dialogue }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);
  // 허용량 = 기본 예산 + 코인으로 산 추가분. 기본분은 −2점/턴, 구매분은 감점 없음(스펙).
  const allowance = TURN_BUDGET + extraTurns;
  const left = allowance - turns;
  const spent = left <= 0;
  const nextPrice = extraTurnPrice(extraTurns);   // 다음 묶음 가격, 다 샀으면 null
  const canBuy = nextPrice != null && money >= nextPrice;
  const buyBlocked = nextPrice == null ? "더는 살 수 없어요" : `코인이 부족해요 (${nextPrice}코인 필요)`;

  // 대본 모드(튜토리얼) — 주인 말이 미리 채워져 있고 '확인'만 누른다. LLM·감점 없음.
  const script = order.script ?? null;
  const [scriptIdx, setScriptIdx] = useState(0);
  const scriptDone = script && scriptIdx >= script.length;

  function advanceScript() {
    if (!script || scriptDone) return;
    const { ask, reply } = script[scriptIdx];
    setMessages((m) => [...m,
      { id: nextId.current++, role: "user", content: ask },
      { id: nextId.current++, role: "monster", content: reply },
    ]);
    setScriptIdx(scriptIdx + 1);
  }
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
    // raw = 손님이 실제로 뱉은 구조(JSON) 원문. 다음 턴에 그대로 되돌려줘야
    // 이미 확인해준 슬롯·상관없는 항목을 손님이 이어받는다(안 그러면 매 턴 잊는다).
    const { reply, raw } = await chat(order.id, next);
    setBusy(false);
    setMessages((m) => [...m, { id: nextId.current++, role: "monster", content: reply, raw }]);
  }

  return (
    <div className="chat">
      <div className="chat-list" ref={listRef}>
        {messages.map((m) => (
          <div key={m.id} className={"bubble " + m.role}>
            {m.role === "monster" && <img className="bubble-face" src={monster.img.normal} alt="" />}
            <span className="bubble-text">{m.content}</span>
            {/* 디버그: 모델이 실제로 뱉은 JSON. raw 가 없으면 mock 응답이라는 뜻 */}
            {import.meta.env.DEV && m.role === "monster" && m.raw && (
              <details className="bubble-raw">
                <summary>raw</summary>
                <pre>{m.raw}</pre>
              </details>
            )}
          </div>
        ))}
        {busy && <div className="bubble monster"><span className="bubble-text">…</span></div>}
      </div>
      {script ? (
        <div className="chat-input chat-scripted">
          {scriptDone ? (
            <span className="script-done">좋아, 주문은 다 들었다! 이제 케이크를 만들어보자 🍰</span>
          ) : (
            <>
              <span className="script-ask">{script[scriptIdx].ask}</span>
              <button className="btn small" onClick={advanceScript}>확인</button>
            </>
          )}
        </div>
      ) : (<>
      <div className="chat-budget">
        {spent
          ? (canBuy
              ? <button className="btn small buy-turn" onClick={onBuyTurn}>질문 {EXTRA_TURN_BUNDLE}번 사기 · {nextPrice}코인</button>
              : `질문을 다 썼어요 · ${buyBlocked}`)
          : turns >= TURN_BUDGET
            ? `산 질문 ${left}번 남음 (감점 없음)`
            : `질문 ${left}번 남음 · 1번에 ${TURN_PENALTY}점`}
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
      </>)}
    </div>
  );
}
