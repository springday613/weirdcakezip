import { useState, useRef, useEffect } from "react";
import { MONSTERS } from "../data/ingredients.js";
import { TURN_BUDGET, TURN_PENALTY, EXTRA_TURN_BUNDLE, extraTurnPrice } from "../scoreCake.js";

// 손님 괴물과의 대화창. messages · scriptIdx 를 props 로 받아 그린다.
// 대화 기록과 대본 진행도는 App 이 소유한다.
//
// 질문 수(turns)는 App 이 들고 있다 — 점수에서 지불하는 값이라 채점까지 가야 한다.
// 예산을 다 쓰면 여기서 막는다.
// dimmed: 튜토리얼 가이드 중 통째로 어둡게. tutFocus="script": 대본 줄만 밝히고 확인을 강조.
export default function ChatBox({ order, messages = [], onSend, busy = false, turns = 0, extraTurns = 0, money = 0, onAsk, onBuyTurn, scriptIdx = 0, onAdvanceScript, dimmed = false, tutFocus = null }) {
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
    <div className={"chat" + (dimmed ? " tut-dim-el" : "")}>
      <div className={"chat-list" + (tutFocus === "script" ? " tut-dim-el" : "")} ref={listRef}>
        {messages.map((m) => (
          <div key={m.id} className={"bubble " + m.role}>
            {m.role === "monster" && <img className="bubble-face" src={monster.img.normal} alt="" />}
            {/* 유저(주인공)는 스토리 바스트샷 — row-reverse 라 오른쪽에 붙는다 */}
            {m.role === "user" && <img className="bubble-face" src="/assets/story_face_user.webp" alt="" />}
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
        <>
          {/* 예산 자리(일반 손님의 '질문 N번 남음' 위치)에 무료 안내 */}
          {!scriptDone && <div className="chat-budget">무료 · 턴 ✕</div>}
          <div className="chat-input chat-scripted">
            {scriptDone ? (
              <span className="script-done">좋아, 주문은 다 들었다! 이제 케이크를 만들어보자 🍰</span>
            ) : (
              <>
                <span className="script-ask">{script[scriptIdx].ask}</span>
                {/* 확인은 매 턴 빛나게 — 다음 행동이 항상 이 버튼이라는 걸 알려준다 */}
                <button className="btn small tut-pulse" onClick={onAdvanceScript} disabled={busy}>
                  확인
                </button>
              </>
            )}
          </div>
        </>
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
