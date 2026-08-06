import { useState, useEffect, useRef } from "react";
import CakeView from "../components/CakeView.jsx";
import IngredientPalette, { STEPS } from "../components/IngredientPalette.jsx";
import { sheetType, BASIC_BASE } from "../data/ingredients.js";
import { TUTORIAL_GUIDE } from "../data/tutorial.js";

export default function OrderScreen({ order, index, total, cake, setCake, onSubmit, busy }) {
  const [step, setStep] = useState(0);
  const [made, setMade] = useState(false);   // 시트가 케이크로 구워졌는가
  const [making, setMaking] = useState(false); // 굽는 중(1초 연출)
  const [warn, setWarn] = useState(false);    // 이상한 시트 조합 경고
  const [folding, setFolding] = useState(false); // 완성 직전, 쪽지 접는 연출(0.3초) — S16
  const [submitted, setSubmitted] = useState(false); // CONFIRM 으로 넘겼음 — 쪽지 프리뷰 억제

  // 튜토리얼(첫 주문) — 물범 인사 두 마디 뒤 치트 시트를 케이크 왼편에 붙인다
  const tut = order.id === TUTORIAL_GUIDE.orderId;
  const [tutIntro, setTutIntro] = useState(tut ? 0 : null); // 0·1 대사 인덱스, null 끝
  const [tutWarn, setTutWarn] = useState(false); // 오답 선택 → "다시 확인해보자"

  // 굽기 타이머(1초 연출) — 핸들을 들고 있어야 리셋·재료 변경 때 취소할 수 있다.
  // 안 그러면 예약된 콜백이 살아남아 빈 반죽을 '구워진 케이크'로 만든다 (S22)
  const bakeTimer = useRef(null);
  const cancelBake = () => {
    clearTimeout(bakeTimer.current);
    bakeTimer.current = null;
  };
  useEffect(() => cancelBake, []); // 언마운트(화면 이탈) 시 유령 굽기 방지

  // 섞기 재료(base)가 바뀌면 케이크 해제 → 다시 보울부터. 경고도 해제.
  // 굽는 중에 재료가 바뀌면 그 굽기는 무효다 — 타이머도 같이 끊는다.
  const baseKey = cake.base.join(",");
  useEffect(() => {
    cancelBake();
    setMaking(false);
    setMade(false);
    setWarn(false);
  }, [baseKey]);

  // 쪽지 쓰는 차례엔 케이크를 치우고 쪽지를 크게 (S16)
  const writingNote = made && !submitted && STEPS[step]?.id === "lettering";
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
      // 정답 종류(복숭아·체리)면 개수 제한 없음 — 잔뜩 올려야 예쁘고, 중복은 채점 감점도 없다.
      // 다른 종류만 차단한다.
      const added = nc.toppings[nc.toppings.length - 1];
      return TUTORIAL_GUIDE.picks.topping.includes(added?.type);
    }
    return true; // 데코·쪽지는 마음대로
  }
  // 실행취소 히스토리 — 조작 직전의 {cake, made, step}을 쌓는다. 직전 실행취소(Ctrl-Z 버튼)가 pop.
  // made·step까지 되돌리는 이유: base 를 undo 하면 baseKey 이펙트가 made 를 풀어버려,
  // cake 만 복원하면 "안 구운 반죽으로 후반 단계 진행" 같은 반쪽 상태가 남는다.
  const history = useRef([]);
  const pushHistory = () => {
    // 문구 타이핑은 1타 1엔트리가 되지 않게 합침 — 직전 엔트리와 lettering.text 만 다르면 안 쌓는다
    const last = history.current[history.current.length - 1];
    if (
      last &&
      last.cake.lettering.text !== cake.lettering.text &&
      JSON.stringify({ ...last.cake, lettering: null }) === JSON.stringify({ ...cake, lettering: null })
    ) {
      return;
    }
    history.current.push({ cake, made, step });
    if (history.current.length > 60) history.current.shift();
  };
  const guardedSetCake = (nc) => {
    if (tut && tutIntro == null && !tutAllows(nc)) {
      setTutWarn(true);
      return;
    }
    setTutWarn(false);
    setSubmitted(false); // CONFIRM 다녀온 뒤 첫 조작부터 쪽지 프리뷰 복귀 (H14)
    pushHistory();
    setCake(nc);
  };
  // 직전 실행취소 — 마지막으로 누른 조작 하나를 되돌린다 (개수 늘리기였으면 개수가 준다)
  const undoLast = () => {
    const prev = history.current.pop();
    if (!prev) return;
    setTutWarn(false);
    setCake(prev.cake);
    setMade(prev.made);
    setStep(prev.step);
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
        cancelBake(); // 연타로 타이머가 겹치지 않게
        bakeTimer.current = setTimeout(() => {
          bakeTimer.current = null;
          setMaking(false);
          setMade(true);
          setStep(1);
        }, 1000);
      } else {
        setWarn(true); // 이상한 조합 → 넘어가지 않음
      }
      return;
    }
    setSubmitted(false);
    setStep(Math.min(step + 1, lastStep));
  }

  // 완성하기 — 쪽지를 접는 모습(0.3초)을 보여준 뒤 제출한다 (S16)
  const foldTimer = useRef(null);
  useEffect(() => () => clearTimeout(foldTimer.current), []); // 언마운트 시 stale 제출 방지
  function handleSubmit() {
    if (folding || busy) return;
    setFolding(true);
    foldTimer.current = setTimeout(() => {
      setFolding(false);
      setSubmitted(true);
      onSubmit();
    }, 300);
  }
  // 제출이 실패로 돌아오면(busy true→false) 접힌 채로 남지 않게 펴 준다
  const wasBusy = useRef(false);
  useEffect(() => {
    if (wasBusy.current && !busy) setFolding(false);
    wasBusy.current = busy;
  }, [busy]);

  // (H13 의 ↺ 마지막-하나 취소는 히스토리 실행취소가 흡수 — undoLast 는 위에서 정의)
  const stepId = STEPS[step]?.id;

  const sheetReady = cake.base.length > 0 && cake.cakeBase;
  const clearBoard = () => {
    pushHistory();
    setCake({ ...cake, toppings: [], deco: [], cream: null });
  };
  const resetAll = () => {
    history.current = []; // 리셋은 실행취소 대상이 아니다
    cancelBake();         // 굽는 중이었으면 예약된 콜백까지 끊는다 (S22)
    setCake({ base: [], cakeBase: "vanilla", cream: null, toppings: [], deco: [], lettering: { text: "", color: null } });
    setMade(false);
    setMaking(false);
    setStep(0);
    setTutWarn(false); // 오답 경고도 함께 지운다
  };

  // 튜토리얼 하이라이트 — 이 단계에서 다음에 눌러야 할 것 하나만 빛낸다.
  // 치트 시트 정답을 아직 안 골랐으면 정답 재료를, 골랐으면 → 를, 마음대로 단계는 → 만.
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
    <div className="screen screen--canvas">
      <div className={"hud hud-row" + introDim}>
        <span>주문 {index + 1} / {total}</span>
      </div>

      {/* 주문 띠 — 팝업 안 열고도 6단계 내내 주문 문장이 보이게. 튜토리얼은 치트 시트가 있어 생략 */}
      {!order.script && (
        <div className="build-order">
          <span className="order-badge">주문</span>
          <p className="build-order-text">{order.dialogue}</p>
        </div>
      )}

      {/* 괴물은 상단 '대화' 버튼(바스트샷)으로 이동 — 제작 화면은 케이크가 주인공 */}
      {/* 물범이 말하는 것으로 통일 — 튜토리얼 가이드와 같은 말풍선 (S25) */}
      {warn && step === 0 && (
        <div className="tut-guide stk" onClick={() => setWarn(false)}>
          <span className="tut-guide-face">
            <img src="/assets/story_face_assistant.webp" alt="" />
            <span className="tut-guide-name">커스터드물범</span>
          </span>
          <p className="tut-guide-line">시트가 뭔가 이상해! 다시 보자</p>
          <span className="tut-guide-adv">≫</span>
        </div>
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

      <div className={"palette-slot" + introDim}>
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
        {/* ↺(H13, 마지막 하나 취소)는 히스토리 실행취소(Ctrl-Z)가 상위호환이라 흡수 — S25 머지 */}
        <button className="chip ghost edit-btn" disabled={making} onClick={resetAll} data-tip="처음부터 다시" aria-label="처음부터 다시">
          <img className="edit-icon" src="/assets/ui_undo.webp" alt="" />
        </button>
        <button className="chip ghost edit-btn" disabled={making} onClick={clearBoard} data-tip="케이크 위 다 지우기" aria-label="케이크 위 다 지우기">
          <img className="edit-icon" src="/assets/ui_broom.webp" alt="" />
        </button>
        <button className="chip ghost edit-btn" disabled={making || history.current.length === 0} onClick={undoLast} data-tip="실행취소" aria-label="실행취소">
          <img className="edit-icon" src="/assets/ui_ctrlz.webp" alt="" />
        </button>
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
