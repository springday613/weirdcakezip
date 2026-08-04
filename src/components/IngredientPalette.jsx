import { useState, useRef, useEffect } from "react";
import { SHEET_BASE, BASIC_BASE, COLORS, TOPPINGS, DECO, lockOf } from "../data/ingredients.js";
import { pickToppingSlot, TOPPING_SLOTS, MAX_CANDLES } from "./CakeView.jsx";
import layout from "../data/cakeLayout.json";

const CANDLE_TYPES = Object.keys(layout.candle.size);
const CREAM_SLOTS = layout.cream.slots.length;
const SPRINKLE_MAX_CLICKS = layout.sprinkle.max_clicks;

// 재료 만들기 단계 (화살표로 이동, 상태는 OrderScreen이 소유)
export const STEPS = [
  { id: "sheet", label: "시트" },
  { id: "color", label: "케이크 베이스" },
  { id: "cream", label: "생크림" },
  { id: "topping", label: "토핑" },
  { id: "deco", label: "데코" },
  { id: "lettering", label: "쪽지" },
];

// 재료 이미지 칩 (이모지·글자 대신 그림). lock 이 있으면 흐림+자물쇠, 클릭은 툴팁만.
// 파일 수준 컴포넌트 — 렌더 안에서 정의하면 매번 새 타입이 되어 리마운트된다(리뷰 지적).
// 바닐라는 전용 재료 그림이 없어 바닐라색 생크림 그림으로 그린다.
function ImgChip({ id, on, onClick, lock, tipOpen, onLockTap, hl }) {
  return (
    <button
      className={"chip img-chip" + (on ? " on" : "") + (lock ? " locked" : "") + (hl ? " tut-pulse" : "")}
      onClick={lock ? onLockTap : onClick}
      title={lock ? undefined : id}
    >
      <img
        className="ing-img"
        src={id === "vanilla" ? "/assets/cream_vanilla.webp" : `/assets/ing_${id}.webp`}
        alt=""
      />
      {lock && <img className="lock-badge" src="/assets/ui_lock.svg" alt="잠김" />}
      {lock && (
        <span className={"lock-tip" + (tipOpen ? " show" : "")}>
          {lock === 1 ? "레벨 1에서 해제!" : "스테이지 2에서 해제!"}
        </span>
      )}
    </button>
  );
}

// 재료 팔레트 — 한 단계씩만 보여준다. orderIndex 는 잠금 판정용(0 = 튜토리얼).
// tutBasic/tutChips: 튜토리얼 하이라이트 — 기본 시트 버튼 / 정답 재료 id 목록 (S21)
export default function IngredientPalette({ step, cake, setCake, orderIndex = 0, tutBasic = false, tutChips = null }) {
  const set = (patch) => setCake({ ...cake, ...patch });

  // 잠긴 재료 → 호버로 해제 시점 툴팁. 터치(호버 없음)는 탭하면 잠깐 띄운다 (S18 — 실제 언락은 후속)
  const [tipId, setTipId] = useState(null);
  const lockTimer = useRef(null);
  useEffect(() => () => clearTimeout(lockTimer.current), []); // 언마운트 후 setTipId 방지
  function tapLock(id) {
    clearTimeout(lockTimer.current);
    setTipId(id);
    lockTimer.current = setTimeout(() => setTipId(null), 1500);
  }

  const toggleBase = (id) =>
    set({ base: cake.base.includes(id) ? cake.base.filter((b) => b !== id) : [...cake.base, id] });

  // 자리는 cakeLayout.json 에 미리 계산돼 있다 — 여기서는 '몇 개째'만 정한다.
  // 토핑은 add 시점에 자리를 뽑아 고정하므로, 뒤에 더 올려도 앞엣것이 안 움직인다.
  const addTopping = (type) => {
    if (cake.toppings.length >= TOPPING_SLOTS) return;
    const slot = pickToppingSlot(cake.toppings.map((t) => t.slot));
    set({ toppings: [...cake.toppings, { type, slot }] });
  };
  // 초는 개수마다 배치가 통째로 바뀌고, 스프링클은 한 번에 여러 알이 올라간다 → 좌표를 안 갖는다
  const addDeco = (type) => {
    const isCandle = CANDLE_TYPES.includes(type);
    const same = cake.deco.filter((d) => d.type === type).length;
    if (isCandle && cake.deco.filter((d) => CANDLE_TYPES.includes(d.type)).length >= MAX_CANDLES) return;
    if (type === "sprinkle" && same >= SPRINKLE_MAX_CLICKS) return;
    set({ deco: [...cake.deco, { type }] });
  };
  const addCream = (colorId) => {
    const dollops = cake.cream?.dollops ?? [];
    if (dollops.length >= CREAM_SLOTS) return;
    set({ cream: { color: colorId, dollops: [...dollops, {}] } });
  };

  const cur = STEPS[step] ?? STEPS[0];
  const isBasic =
    BASIC_BASE.length === cake.base.length && BASIC_BASE.every((b) => cake.base.includes(b));

  // 색내기 재료 칩 (단일 선택) — 시트/생크림/쪽지 공용. kind 는 잠금 테이블 키(null = 잠금 없음).
  const colorChips = (kind, selectedId, onPick) =>
    COLORS.map((c) => (
      <ImgChip
        key={c.id}
        id={c.id}
        on={selectedId === c.id}
        lock={kind ? lockOf(kind, c.id, orderIndex) : null}
        hl={tutChips?.includes(c.id)}
        tipOpen={tipId === c.id}
        onLockTap={() => tapLock(c.id)}
        onClick={() => onPick(c.id)}
      />
    ));

  return (
    <div className="palette">
      <div className="step-box">
      <div className="step-title">{cur.label} <em>{step + 1}/{STEPS.length}</em></div>

      {cur.id === "sheet" && (
        <>
          <div className="palette-row">
            <span className="palette-label">섞기</span>
            <button
              className={"chip" + (isBasic ? " on" : "") + (tutBasic ? " tut-pulse" : "")}
              onClick={() => set({ base: isBasic ? [] : [...BASIC_BASE] })}
            >
              기본 시트
            </button>
            {SHEET_BASE.map((b) => (
              <ImgChip
                key={b.id}
                id={b.id}
                on={cake.base.includes(b.id)}
                lock={lockOf("sheet", b.id, orderIndex)}
                hl={tutChips?.includes(b.id)}
                tipOpen={tipId === b.id}
                onLockTap={() => tapLock(b.id)}
                onClick={() => toggleBase(b.id)}
              />
            ))}
          </div>
          <div className="palette-row">
            <span className="palette-label" />
            <span className="note">기본 조합 = 밀가루 + 우유 + 계란 + 버터</span>
          </div>
        </>
      )}

      {cur.id === "color" && (
        <div className="palette-row">
          <span className="palette-label">케이크 베이스</span>
          {colorChips("color", cake.cakeBase, (id) => set({ cakeBase: id }))}
        </div>
      )}

      {cur.id === "cream" && (
        <div className="palette-row">
          <span className="palette-label">생크림</span>
          {colorChips("cream", cake.cream?.color, addCream)}
        </div>
      )}

      {cur.id === "topping" && (
        <div className="palette-row">
          <span className="palette-label">토핑</span>
          {TOPPINGS.map((t) => (
            <ImgChip
              key={t.id}
              id={t.id}
              lock={lockOf("topping", t.id, orderIndex)}
              hl={tutChips?.includes(t.id)}
              tipOpen={tipId === t.id}
              onLockTap={() => tapLock(t.id)}
              onClick={() => addTopping(t.id)}
            />
          ))}
        </div>
      )}

      {cur.id === "deco" && (
        <div className="palette-row">
          <span className="palette-label">데코</span>
          {DECO.map((d) => (
            <ImgChip key={d.id} id={d.id} onClick={() => addDeco(d.id)} />
          ))}
        </div>
      )}

      {cur.id === "lettering" && (
        <div className="palette-row">
          <span className="palette-label">문구</span>
          <button
            className={"chip" + (!cake.lettering.text ? " on" : "")}
            onClick={() => set({ lettering: { text: "", color: null } })}
          >
            안 씀
          </button>
          <input
            className="lettering-input"
            type="text"
            maxLength={12}
            placeholder="쪽지에 쓸 문구"
            value={cake.lettering.text}
            onChange={(e) => set({ lettering: { ...cake.lettering, text: e.target.value } })}
          />
        </div>
      )}

      </div>
    </div>
  );
}
