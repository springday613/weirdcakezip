import { useState, useEffect } from "react";
import CakeView from "../components/CakeView.jsx";
import IngredientPalette, { STEPS } from "../components/IngredientPalette.jsx";
import { MONSTERS, sheetType } from "../data/ingredients.js";

export default function OrderScreen({ order, index, total, money, cake, setCake, onSubmit, busy }) {
  const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;
  const [step, setStep] = useState(0);
  const [made, setMade] = useState(false);   // 시트가 케이크로 구워졌는가
  const [making, setMaking] = useState(false); // 굽는 중(1초 연출)
  const [warn, setWarn] = useState(false);    // 이상한 시트 조합 경고

  // 섞기 재료(base)가 바뀌면 케이크 해제 → 다시 보울부터. 경고도 해제.
  const baseKey = cake.base.join(",");
  useEffect(() => { setMade(false); setWarn(false); }, [baseKey]);

  const preview = making
    ? "making"
    : made
    ? "cake"
    : cake.base.length === 0
    ? "bowl-empty"
    : "bowl-dough";

  const lastStep = STEPS.length - 1;

  // 시트 단계에서 '다음' → 조합 검증 후 굽기(1초) or 경고
  function goNext() {
    if (step === 0 && !made) {
      if (sheetType(cake.base)) {
        setWarn(false);
        setMaking(true);
        setTimeout(() => {
          setMaking(false);
          setMade(true);
          setStep(1);
        }, 1000);
      } else {
        setWarn(true); // 이상한 조합 → 넘어가지 않음
      }
      return;
    }
    setStep(Math.min(step + 1, lastStep));
  }

  const sheetReady = cake.base.length > 0 && cake.cakeBase;
  const clearBoard = () => setCake({ ...cake, toppings: [], deco: [], cream: null });
  // 지금 보고 있는 단계의 재료만 비운다 — 다른 단계는 건드리지 않는다
  const clearStep = () => {
    const id = STEPS[step]?.id;
    if (id === "sheet") setCake({ ...cake, base: [] });
    else if (id === "color") setCake({ ...cake, cakeBase: null });
    else if (id === "cream") setCake({ ...cake, cream: null });
    else if (id === "topping") setCake({ ...cake, toppings: [] });
    else if (id === "deco") setCake({ ...cake, deco: [] });
    else if (id === "lettering") setCake({ ...cake, lettering: { text: "", color: null } });
  };
  const resetAll = () => {
    setCake({ base: [], cakeBase: null, cream: null, toppings: [], deco: [], lettering: { text: "", color: null } });
    setMade(false);
    setMaking(false);
    setStep(0);
  };

  return (
    <div className="screen">
      <div className="hud hud-row">
        <span>주문 {index + 1} / {total}</span>
        <span className="money">매출 {(money ?? 0).toLocaleString()}원</span>
      </div>

      <div className="monster-row">
        <img className="monster-big" src={monster.img.normal} alt="손님 괴물" />
        {warn && step === 0 && (
          <div className="warn-bubble">시트가 뭔가 이상해! 다시 보자</div>
        )}
      </div>
      <CakeView cake={cake} preview={preview} />

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
        <button className="chip ghost" onClick={resetAll}>다시시작</button>
        <button className="chip ghost" onClick={clearBoard}>케이크위 다 지우기</button>
        <button className="chip ghost" onClick={clearStep}>현재 단계만 지우기</button>
      </div>
    </div>
  );
}
