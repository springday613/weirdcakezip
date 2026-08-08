import { useState } from "react";

// 이름 입력 화면 (S19) — 스토리 시작 전 주인공 이름을 받는다. 랜덤은 수식어+재료 1+2 조합.
const ADJ = ["몽글몽글한", "달콤한", "새콤한", "알록달록한"];
const ING = ["딸기", "체리", "초콜릿", "스프링클"];
const roll = () =>
  ADJ[Math.floor(Math.random() * ADJ.length)] + ING[Math.floor(Math.random() * ING.length)];

export default function NameScreen({ onDone }) {
  const [name, setName] = useState("");
  const ok = name.trim().length > 0;
  return (
    <div className="name-screen">
      <div className="name-card stk">
        <p className="name-title">너의 이름은?</p>
        <input
          className="lettering-input name-input"
          type="text"
          maxLength={8}
          placeholder="이름을 지어줘"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ok && onDone(name.trim())}
        />
        <div className="name-actions">
          <button className="chip ghost" onClick={() => setName(roll())}>랜덤</button>
          <button className="btn small" disabled={!ok} onClick={() => onDone(name.trim())}>
            이걸로 할래!
          </button>
        </div>
      </div>
    </div>
  );
}
