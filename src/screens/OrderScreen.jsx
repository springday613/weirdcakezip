import { useState, useEffect, useRef } from "react";
import CakeView from "../components/CakeView.jsx";
import IngredientPalette, { STEPS } from "../components/IngredientPalette.jsx";
import { sheetType } from "../data/ingredients.js";

export default function OrderScreen({ order, index, total, money, cake, setCake, onSubmit, busy }) {
  const [step, setStep] = useState(0);
  const [made, setMade] = useState(false);   // 시트가 케이크로 구워졌는가
  const [making, setMaking] = useState(false); // 굽는 중(1초 연출)
  const [warn, setWarn] = useState(false);    // 이상한 시트 조합 경고
  const [folding, setFolding] = useState(false); // 완성 직전, 쪽지 접는 연출(0.3초)

  // 섞기 재료(base)가 바뀌면 케이크 해제 → 다시 보울부터. 경고도 해제.
  const baseKey = cake.base.join(",");
  useEffect(() => { setMade(false); setWarn(false); }, [baseKey]);

  // 쪽지 쓰는 차례엔 케이크를 치우고 쪽지를 크게 — 쓰는 대상이 화면의 주인공이 되게
  const writingNote = made && STEPS[step]?.id === "lettering";
  const preview = making
    ? "making"
    : folding
    ? "note-folded"
    : writingNote
    ? "note"
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

  // 완성하기 — 쪽지를 접는 모습(0.3초)을 보여준 뒤 제출한다
  const foldTimer = useRef(null);
  useEffect(() => () => clearTimeout(foldTimer.current), []); // 언마운트 시 stale 제출 방지
  function handleSubmit() {
    if (folding || busy) return;
    setFolding(true);
    foldTimer.current = setTimeout(onSubmit, 300);
  }
  // 제출이 실패로 돌아오면(busy true→false) 접힌 채로 남지 않게 펴 준다
  const wasBusy = useRef(false);
  useEffect(() => {
    if (wasBusy.current && !busy) setFolding(false);
    wasBusy.current = busy;
  }, [busy]);

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
        <span className="money">매출 {(money ?? 0).toLocaleString()}코인</span>
      </div>

      {/* 괴물은 상단 '대화' 버튼(바스트샷)으로 이동 — 제작 화면은 케이크가 주인공 */}
      {warn && step === 0 && (
        <div className="warn-bubble warn-bubble--center">시트가 뭔가 이상해! 다시 보자</div>
      )}
      <CakeView cake={cake} preview={preview} />

      <IngredientPalette step={step} cake={cake} setCake={setCake} />

      <div className="make-nav">
        <button className="arrow" disabled={step === 0 || making} onClick={() => setStep(step - 1)}>
          ←
        </button>
        <button
          className="btn submit"
          onClick={handleSubmit}
          disabled={busy || making || folding || step !== lastStep}
        >
          {busy ? "괴물이 살펴보는 중..." : "완성하기"}
        </button>
        <button className="arrow" disabled={step === lastStep || making} onClick={goNext}>
          →
        </button>
      </div>

      <div className="edit-row">
        {/* 굽는 중엔 잠근다 — 타이머가 살아 있어 빈 반죽이 구워지는 사고 방지(KAN-34) */}
        <button className="chip ghost" disabled={making} onClick={resetAll}>다시시작</button>
        <button className="chip ghost" disabled={making} onClick={clearBoard}>케이크위 다 지우기</button>
        <button className="chip ghost" disabled={making} onClick={clearStep}>현재 단계만 지우기</button>
      </div>
    </div>
  );
}
