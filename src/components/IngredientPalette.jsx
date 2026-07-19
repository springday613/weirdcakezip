import { SHEET_BASE, BASIC_BASE, COLORS, TOPPINGS, DECO } from "../data/ingredients.js";

// 재료 만들기 단계 (화살표로 이동, 상태는 OrderScreen이 소유)
export const STEPS = [
  { id: "sheet", label: "시트" },
  { id: "color", label: "맛/색" },
  { id: "cream", label: "생크림" },
  { id: "topping", label: "토핑" },
  { id: "deco", label: "데코" },
  { id: "lettering", label: "레터링" },
];

// 재료 팔레트 — 한 단계씩만 보여준다.
export default function IngredientPalette({ step, cake, setCake }) {
  const set = (patch) => setCake({ ...cake, ...patch });

  const toggleBase = (id) =>
    set({ base: cake.base.includes(id) ? cake.base.filter((b) => b !== id) : [...cake.base, id] });

  // 케이크 윗면(아이싱) 타원 둘레에 둥글게 채우기 — 가장자리 링부터 안쪽으로.
  const ringPos = (n, rx, ry, per) => {
    const ring = Math.floor(n / per);
    const idx = n % per;
    const ang = (idx / per) * 2 * Math.PI + ring * 0.5 - Math.PI / 2;
    const s = Math.max(0.2, 1 - ring * 0.32);
    return {
      x: Math.round(50 + Math.cos(ang) * rx * s),
      y: Math.round(34 + Math.sin(ang) * ry * s),
    };
  };
  // 토핑: 가장자리부터 / 초(데코): 살짝 안쪽 / 크림: 맨 바깥 테두리
  const addTopping = (type) =>
    set({ toppings: [...cake.toppings, { type, ...ringPos(cake.toppings.length, 24, 9, 9) }] });
  const addDeco = (type) =>
    set({ deco: [...cake.deco, { type, ...ringPos(cake.deco.length, 16, 6, 7) }] });
  const addCream = (colorId) => {
    const dollops = cake.cream?.dollops ?? [];
    set({ cream: { color: colorId, dollops: [...dollops, ringPos(dollops.length, 18, 8, 8)] } });
  };

  const cur = STEPS[step] ?? STEPS[0];

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
      <div className="step-box">
      <div className="step-title">{cur.label} <em>{step + 1}/{STEPS.length}</em></div>

      {cur.id === "sheet" && (
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
        </>
      )}

      {cur.id === "color" && (
        <div className="palette-row">
          <span className="palette-label">맛/색</span>
          {colorChips(cake.sheetColor, (id) => set({ sheetColor: id }))}
        </div>
      )}

      {cur.id === "cream" && (
        <div className="palette-row">
          <span className="palette-label">생크림</span>
          <button className={"chip" + (!cake.cream ? " on" : "")} onClick={() => set({ cream: null })}>
            안 올림
          </button>
          {colorChips(cake.cream?.color, addCream)}
        </div>
      )}

      {cur.id === "topping" && (
        <div className="palette-row">
          <span className="palette-label">토핑</span>
          {TOPPINGS.map((t) => (
            <button key={t.id} className="chip" onClick={() => addTopping(t.id)}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      )}

      {cur.id === "deco" && (
        <div className="palette-row">
          <span className="palette-label">데코</span>
          {DECO.map((d) => (
            <button key={d.id} className="chip" onClick={() => addDeco(d.id)}>
              {d.emoji} {d.label}
            </button>
          ))}
        </div>
      )}

      {cur.id === "lettering" && (
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
    </div>
  );
}
