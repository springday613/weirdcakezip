import { useState, useEffect, useRef } from "react";
import CakeView from "../components/CakeView.jsx";
import IngredientPalette, { STEPS } from "../components/IngredientPalette.jsx";
import { sheetType, BASIC_BASE } from "../data/ingredients.js";
import { TUTORIAL_GUIDE } from "../data/tutorial.js";

export default function OrderScreen({ order, index, total, money, cake, setCake, onSubmit, busy }) {
  const [step, setStep] = useState(0);
  const [made, setMade] = useState(false);   // 시트가 케이크로 구워졌는가
  const [making, setMaking] = useState(false); // 굽는 중(1초 연출)
  const [warn, setWarn] = useState(false);    // 이상한 시트 조합 경고
  const [folding, setFolding] = useState(false); // 완성 직전, 쪽지 접는 연출(0.3초) — S16

  // 튜토리얼(첫 주문) — 물범 인사 두 마디 뒤 치트 시트를 케이크 왼편에 붙인다
  const tut = order.id === TUTORIAL_GUIDE.orderId;
  const [tutIntro, setTutIntro] = useState(tut ? 0 : null); // 0·1 대사 인덱스, null 끝
  const [tutWarn, setTutWarn] = useState(false); // 오답 선택 → "다시 확인해보자"

  // 섞기 재료(base)가 바뀌면 케이크 해제 → 다시 보울부터. 경고도 해제.
  const baseKey = cake.base.join(",");
  useEffect(() => { setMade(false); setWarn(false); }, [baseKey]);

  // 쪽지 쓰는 차례엔 케이크를 치우고 쪽지를 크게 (S16)
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

  // 튜토리얼 오답 차단 — 치트 시트와 다른 선택은 적용하지 않고 물범이 되짚어 준다
  const isBasicOf = (base) =>
    BASIC_BASE.length === base.length && BASIC_BASE.every((b) => base.includes(b));
  function tutAllows(nc) {
    if (nc.base !== cake.base) return nc.base.every((b) => BASIC_BASE.includes(b));
    if (nc.cakeBase !== cake.cakeBase) return nc.cakeBase === TUTORIAL_GUIDE.picks.color;
    if (nc.cream !== cake.cream) return nc.cream?.color === TUTORIAL_GUIDE.picks.cream;
    if (nc.toppings !== cake.toppings) {
      // 정답 토핑만, 종류당 1개까지 — 치트 시트와 똑같은 케이크가 나오게
      const added = nc.toppings[nc.toppings.length - 1];
      if (!TUTORIAL_GUIDE.picks.topping.includes(added?.type)) return false;
      return cake.toppings.every((t) => t.type !== added.type);
    }
    return true; // 데코·쪽지는 마음대로
  }
  const guardedSetCake = (nc) => {
    if (tut && tutIntro == null && !tutAllows(nc)) {
      setTutWarn(true);
      return;
    }
    setTutWarn(false);
    setCake(nc);
  };
  // 튜토리얼에서 이 단계가 아직 정답이 아니면 → 로 못 넘어간다
  function tutStepDone() {
    const id = STEPS[step]?.id;
    if (id === "sheet") return isBasicOf(cake.base);
    if (id === "color") return cake.cakeBase === TUTORIAL_GUIDE.picks.color;
    if (id === "cream")
      return (
        cake.cream?.color === TUTORIAL_GUIDE.picks.cream &&
        (cake.cream?.dollops?.length ?? 0) >= TUTORIAL_GUIDE.creamDollops
      );
    if (id === "topping")
      return TUTORIAL_GUIDE.picks.topping.every((t) => cake.toppings.some((x) => x.type === t));
    return true;
  }

  // 시트 단계에서 '다음' → 조합 검증 후 굽기(1초) or 경고
  function goNext() {
    if (tut && tutIntro == null && !tutStepDone()) {
      setTutWarn(true);
      return;
    }
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

  // 완성하기 — 쪽지를 접는 모습(0.3초)을 보여준 뒤 제출한다 (S16)
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
  // 지금 보고 있는 단계의 재료만 비운다 — 다른 단계는 건드리지 않는다 (S20)
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
    setCake({
      base: [], cakeBase: "vanilla", cream: null, toppings: [], deco: [],
      // 튜토리얼은 쪽지 인사말을 되살린다 — 빈칸으로 돌아가면 예시가 사라진다
      lettering: { text: tut ? TUTORIAL_GUIDE.noteText : "", color: null },
    });
    setMade(false);
    setMaking(false);
    setStep(0);
    setTutWarn(false); // 오답 경고도 함께 지운다
  };

  // 튜토리얼 하이라이트 — 이 단계에서 다음에 눌러야 할 것 하나만 빛낸다.
  // 치트 시트 정답을 아직 안 골랐으면 정답 재료를, 골랐으면 → 를, 마음대로 단계는 → 만.
  const stepId = STEPS[step]?.id;
  let tutBasic = false, tutChips = null, tutArrow = false, tutSubmit = false;
  if (tut && tutIntro == null && !making) {
    const hasTopping = (t) => cake.toppings.some((x) => x.type === t);
    if (stepId === "sheet") {
      if (isBasicOf(cake.base)) tutArrow = true;
      else tutBasic = true;
    } else if (stepId === "color") {
      if (cake.cakeBase === TUTORIAL_GUIDE.picks.color) tutArrow = true;
      else tutChips = [TUTORIAL_GUIDE.picks.color];
    } else if (stepId === "cream") {
      const enough =
        cake.cream?.color === TUTORIAL_GUIDE.picks.cream &&
        (cake.cream?.dollops?.length ?? 0) >= TUTORIAL_GUIDE.creamDollops;
      if (enough) tutArrow = true;
      else tutChips = [TUTORIAL_GUIDE.picks.cream]; // 채울 때까지 계속 빛난다
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

  const introDim = tut && tutIntro != null ? " tut-dim-el" : ""; // 물범 인사 중 배경 어둡게

  return (
    <div className="screen">
      <div className={"hud hud-row" + introDim}>
        <span>주문 {index + 1} / {total}</span>
        <span className="money">매출 {(money ?? 0).toLocaleString()}코인</span>
      </div>

      {/* 괴물은 상단 '대화' 버튼(바스트샷)으로 이동 — 제작 화면은 케이크가 주인공 */}
      {warn && step === 0 && (
        <div className="warn-bubble warn-bubble--center">시트가 뭔가 이상해! 다시 보자</div>
      )}
      <div className={"cake-wrap" + introDim}>
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

      <div className={introDim || undefined}>
        <IngredientPalette
          step={step}
          cake={cake}
          setCake={guardedSetCake}
          orderIndex={index}
          tutBasic={tutBasic}
          tutChips={tutChips}
        />
      </div>

      <div className={"make-nav" + introDim}>
        <button className="arrow" disabled={step === 0 || making} onClick={() => setStep(step - 1)}>
          ←
        </button>
        <button
          className={"btn submit" + (tutSubmit ? " tut-pulse" : "")}
          onClick={handleSubmit}
          disabled={busy || making || folding || step !== lastStep}
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

      <div className={"edit-row" + introDim}>
        {/* 굽는 중엔 잠근다 — 타이머가 살아 있어 빈 반죽이 구워지는 사고 방지(KAN-34) */}
        <button className="chip ghost" disabled={making} onClick={resetAll}>다시시작</button>
        <button className="chip ghost" disabled={making} onClick={clearBoard}>케이크위 다 지우기</button>
        <button className="chip ghost" disabled={making} onClick={clearStep}>현재 단계만 지우기</button>
      </div>

      {/* 오답 선택 — 물범이 치트 시트를 다시 보게 한다 */}
      {tutWarn && (
        <div className="tut-guide stk" onClick={() => setTutWarn(false)}>
          <span className="tut-guide-face">
            <img src="/assets/story_face_assistant.webp" alt="" />
            <span className="tut-guide-name">커스터드물범</span>
          </span>
          <p className="tut-guide-line">다시 확인해보자! 치트 시트를 봐봐~</p>
          <span className="tut-guide-adv">≫</span>
        </div>
      )}

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
