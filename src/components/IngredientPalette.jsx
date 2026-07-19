import { useState } from "react";
import { SHEET_BASE, BASIC_BASE, COLORS, TOPPINGS, DECO } from "../data/ingredients.js";

// 재료 팔레트 — 탭으로 한 번에 하나씩만 보여 중복/피로 제거.
// 시트/생크림/레터링은 같은 '색내기 재료(COLORS)'를 쓰지만 탭이라 동시에 안 겹침.
export default function IngredientPalette({ cake, setCake }) {
  const [tab, setTab] = useState("sheet");
  const set = (patch) => setCake({ ...cake, ...patch });

  const toggleBase = (id) =>
    set({ base: cake.base.includes(id) ? cake.base.filter((b) => b !== id) : [...cake.base, id] });

  const scatter = () => {
    const n = (cake.toppings?.length ?? 0) + (cake.deco?.length ?? 0);
    return { x: 28 + ((n * 37) % 44), y: 30 + ((n * 53) % 40) };
  };
  const addTopping = (type) => set({ toppings: [...cake.toppings, { type, ...scatter() }] });
  const addDeco = (type) => set({ deco: [...cake.deco, { type, ...scatter() }] });

  const TABS = [
    { id: "sheet", label: "시트" },
    { id: "cream", label: "생크림" },
    { id: "topping", label: "토핑" },
    { id: "deco", label: "데코" },
    { id: "lettering", label: "레터링" },
  ];

  // 색내기 재료 칩 (단일 선택) — 시트/생크림/레터링 공용
  const colorChips = (selectedId, onPick) =>
    COLORS.map((c) => (
      <button
        key={c.id}
        className={"chip" + (selectedId === c.id ? " on" : "")}
        onClick={() => onPick(c.id)}
      >
        {c.emoji} {c.label}
      </button>
    ));

  return (
    <div className="palette">
      <div className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={"tab" + (tab === t.id ? " on" : "")}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sheet" && (
        <>
          <div className="palette-row">
            <span className="palette-label">섞기</span>
            <button className="chip" onClick={() => set({ base: [...BASIC_BASE] })}>
              ⭐ 기본 시트
            </button>
            {SHEET_BASE.map((b) => (
              <button
                key={b.id}
                className={"chip" + (cake.base.includes(b.id) ? " on" : "")}
                onClick={() => toggleBase(b.id)}
              >
                {b.emoji} {b.label}
              </button>
            ))}
          </div>
          <div className="palette-row">
            <span className="palette-label" />
            <span className="note">기본 조합 = 밀가루 + 우유 + 계란 + 버터</span>
          </div>
          <div className="palette-row">
            <span className="palette-label">맛/색</span>
            {colorChips(cake.sheetColor, (id) => set({ sheetColor: id }))}
          </div>
        </>
      )}

      {tab === "cream" && (
        <div className="palette-row">
          <span className="palette-label">생크림</span>
          <button className={"chip" + (!cake.cream ? " on" : "")} onClick={() => set({ cream: null })}>
            안 올림
          </button>
          {colorChips(cake.cream?.color, (id) => set({ cream: { color: id } }))}
        </div>
      )}

      {tab === "topping" && (
        <div className="palette-row">
          <span className="palette-label">토핑</span>
          {TOPPINGS.map((t) => (
            <button key={t.id} className="chip" onClick={() => addTopping(t.id)}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === "deco" && (
        <div className="palette-row">
          <span className="palette-label">데코</span>
          {DECO.map((d) => (
            <button key={d.id} className="chip" onClick={() => addDeco(d.id)}>
              {d.emoji} {d.label}
            </button>
          ))}
        </div>
      )}

      {tab === "lettering" && (
        <>
          <div className="palette-row">
            <span className="palette-label">문구</span>
            <button
              className={"chip" + (!cake.lettering.text ? " on" : "")}
              onClick={() => set({ lettering: { text: "", color: null } })}
            >
              안 올림
            </button>
            <input
              className="lettering-input"
              type="text"
              maxLength={12}
              placeholder="케이크 위 문구"
              value={cake.lettering.text}
              onChange={(e) => set({ lettering: { ...cake.lettering, text: e.target.value } })}
            />
          </div>
          <div className="palette-row">
            <span className="palette-label">글자 맛</span>
            {colorChips(cake.lettering.color, (id) =>
              set({ lettering: { ...cake.lettering, color: id } })
            )}
          </div>
        </>
      )}
    </div>
  );
}
