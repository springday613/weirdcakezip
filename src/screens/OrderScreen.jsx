import { useState, useEffect } from "react";
import CakeView from "../components/CakeView.jsx";
import IngredientPalette, { STEPS } from "../components/IngredientPalette.jsx";
import { sheetType, BASIC_BASE } from "../data/ingredients.js";
import { TUTORIAL_GUIDE } from "../data/tutorial.js";

export default function OrderScreen({ order, index, total, money, cake, setCake, onSubmit, busy }) {
  const [step, setStep] = useState(0);
  const [made, setMade] = useState(false);   // 시트가 케이크로 구워졌는가
  const [making, setMaking] = useState(false); // 굽는 중(1초 연출)
  const [warn, setWarn] = useState(false);    // 이상한 시트 조합 경고

  // 튜토리얼(첫 주문) — 물범 인사 두 마디 뒤 치트 시트를 케이크 왼편에 붙인다
  const tut = order.id === TUTORIAL_GUIDE.orderId;
  const [tutIntro, setTutIntro] = useState(tut ? 0 : null); // 0·1 대사 인덱스, null 끝

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
  const resetAll = () => {
    setCake({ base: [], cakeBase: null, cream: null, toppings: [], deco: [], lettering: { text: "", color: null } });
    setMade(false);
    setMaking(false);
    setStep(0);
  };

  // 튜토리얼 하이라이트 — 이 단계에서 다음에 눌러야 할 것 하나만 빛낸다.
  // 치트 시트 정답을 아직 안 골랐으면 정답 재료를, 골랐으면 → 를, 마음대로 단계는 → 만.
  const stepId = STEPS[step]?.id;
  let tutBasic = false, tutChips = null, tutArrow = false, tutSubmit = false;
  if (tut && tutIntro == null && !making) {
    const isBasic =
      BASIC_BASE.length === cake.base.length && BASIC_BASE.every((b) => cake.base.includes(b));
    const hasTopping = (t) => cake.toppings.some((x) => x.type === t);
    if (stepId === "sheet") {
      if (isBasic) tutArrow = true;
      else tutBasic = true;
    } else if (stepId === "color") {
      if (cake.cakeBase === TUTORIAL_GUIDE.picks.color) tutArrow = true;
      else tutChips = [TUTORIAL_GUIDE.picks.color];
    } else if (stepId === "cream") {
      if (cake.cream?.color === TUTORIAL_GUIDE.picks.cream) tutArrow = true;
      else tutChips = [TUTORIAL_GUIDE.picks.cream];
    } else if (stepId === "topping") {
      const missing = TUTORIAL_GUIDE.picks.topping.filter((t) => !hasTopping(t));
      if (missing.length === 0) tutArrow = true;
      else tutChips = missing;
    } else if (stepId === "deco") {
      tutArrow = true;
    } else if (stepId === "lettering") {
      tutSubmit = true;
    }
  }

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
      <div className="cake-wrap">
        {/* 치트 시트 — 물범 인사가 끝나면 케이크 왼편에 붙는다 */}
        {tut && tutIntro == null && (
          <div className="tut-cheat">
            <img src="/assets/note_open.webp" alt="치트 시트" />
            <ul className="tut-cheat-lines">
              {TUTORIAL_GUIDE.cheat.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
        <CakeView cake={cake} preview={preview} />
      </div>

      <IngredientPalette step={step} cake={cake} setCake={setCake} tutBasic={tutBasic} tutChips={tutChips} />

      <div className="make-nav">
        <button className="arrow" disabled={step === 0 || making} onClick={() => setStep(step - 1)}>
          ←
        </button>
        <button
          className={"btn submit" + (tutSubmit ? " tut-pulse" : "")}
          onClick={onSubmit}
          disabled={busy || making || step !== lastStep}
        >
          {busy ? "괴물이 살펴보는 중..." : "완성하기"}
        </button>
        <button
          className={"arrow" + (tutArrow ? " tut-pulse" : "")}
          disabled={step === lastStep || making}
          onClick={goNext}
        >
          →
        </button>
      </div>

      <div className="edit-row">
        <button className="chip ghost" onClick={clearBoard}>케이크 위 지우기</button>
        <button className="chip ghost" onClick={resetAll}>처음부터 만들기</button>
      </div>

      {/* 물범 인사 — 치트 시트를 꺼내기 전 두 마디 */}
      {tut && tutIntro != null && (
        <div className="tut-guide stk" onClick={() => setTutIntro(tutIntro === 0 ? 1 : null)}>
          <span className="tut-guide-face">
            <img src="/assets/story_face_assistant.webp" alt="" />
            <span className="tut-guide-name">커스터드물범</span>
          </span>
          <p className="tut-guide-line">{TUTORIAL_GUIDE.intro[tutIntro]}</p>
          <span className="tut-guide-adv">≫</span>
        </div>
      )}
    </div>
  );
}
