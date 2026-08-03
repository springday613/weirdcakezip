import { useState, useRef, useEffect } from "react";
import { MONSTERS } from "../data/ingredients.js";
import { TURN_BUDGET, TURN_PENALTY, EXTRA_TURN_BUNDLE, extraTurnPrice } from "../scoreCake.js";

// 손님 괴물과의 대화창. messages · scriptIdx 를 props 로 받아 그린다.
// 대화 기록과 대본 진행도는 App 이 소유한다.
//
// 질문 수(turns)는 App 이 들고 있다 — 점수에서 지불하는 값이라 채점까지 가야 한다.
// 예산을 다 쓰면 여기서 막는다.
export default function ChatBox({ order, messages = [], onSend, busy = false, turns = 0, extraTurns = 0, money = 0, onAsk, onBuyTurn, scriptIdx = 0, onAdvanceScript }) {
  const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;
  const [input, setInput] = useState("");
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
  const scriptDone = script && scriptIdx >= script.length;

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages, busy]);

  function send() {
    const text = input.trim();
    if (!text || busy || spent) return;
    setInput("");
    onSend?.(text);
    onAsk?.();
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
              <button className="btn small" onClick={onAdvanceScript}>확인</button>
            </>
          )}
          <span className="script-badge">무료 · 턴 ✕</span>
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
