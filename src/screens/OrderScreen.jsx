import { useState, useEffect } from "react";
import CakeView from "../components/CakeView.jsx";
import IngredientPalette, { STEPS } from "../components/IngredientPalette.jsx";
import ChatBox from "../components/ChatBox.jsx";
import { MONSTERS } from "../data/ingredients.js";

export default function OrderScreen({ order, index, total, money, cake, setCake, onSubmit, busy }) {
  const monster = MONSTERS[order.monster] ?? MONSTERS.ghost;
  const [step, setStep] = useState(0);
  const [made, setMade] = useState(false);   // 시트가 케이크로 구워졌는가
  const [making, setMaking] = useState(false); // 굽는 중(1초 연출)

  // 섞기 재료(base)가 바뀌면 케이크 해제 → 다시 보울부터. (맛/색만 바꾸면 유지)
  const baseKey = cake.base.join(",");
  useEffect(() => { setMade(false); }, [baseKey]);

  const preview = making
    ? "making"
    : made
    ? "cake"
    : cake.base.length === 0
    ? "bowl-empty"
    : "bowl-dough";

  const lastStep = STEPS.length - 1;

  // 시트 단계에서 '다음' → 굽기 연출 1초 후 케이크로 (색은 다음 단계에서)
  function goNext() {
    if (step === 0 && !made && cake.base.length > 0) {
      setMaking(true);
      setTimeout(() => {
        setMaking(false);
        setMade(true);
        setStep(1);
      }, 1000);
    } else {
      setStep(Math.min(step + 1, lastStep));
    }
  }

  // 케이크 위 클릭 → 선택된 토핑/데코를 그 좌표에 배치 (드래그 대신 좌표 클릭)
  function place(placing, x, y) {
    const item = { type: placing.type, x, y };
    if (placing.kind === "deco") setCake({ ...cake, deco: [...cake.deco, item] });
    else setCake({ ...cake, toppings: [...cake.toppings, item] });
  }
  const sheetReady = cake.base.length > 0 && cake.sheetColor;
  const clearBoard = () => setCake({ ...cake, toppings: [], deco: [] });
  const resetAll = () =>
    setCake({ base: [], sheetColor: null, cream: null, toppings: [], deco: [], lettering: { text: "", color: null } });

  return (
    <div className="screen">
      <div className="hud hud-row">
        <span>주문 {index + 1} / {total}</span>
        <span className="money">💰 {(money ?? 0).toLocaleString()}원</span>
      </div>

      <img className="monster-big" src={monster.img.normal} alt="손님 괴물" />

      {/* 애매한 주문은 대화로 푼다 (런타임 LLM) */}
      <ChatBox order={order} />

      <CakeView cake={cake} preview={preview} onPlace={place} />

      <IngredientPalette step={step} cake={cake} setCake={setCake} />

      <div className="make-nav">
        <button className="arrow" disabled={step === 0 || making} onClick={() => setStep(step - 1)}>
          ←
        </button>
        <button
          className="btn submit"
          onClick={onSubmit}
          disabled={busy || making || step !== lastStep}
        >
          {busy ? "괴물이 살펴보는 중..." : "완성하기"}
        </button>
        <button className="arrow" disabled={step === lastStep || making} onClick={goNext}>
          →
        </button>
      </div>

      <div className="edit-row">
        <button className="chip ghost" onClick={clearBoard}>🧹 케이크 위 지우기</button>
        <button className="chip ghost" onClick={resetAll}>↺ 처음부터 만들기</button>
      </div>
    </div>
  );
}
