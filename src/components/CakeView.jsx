import { hexOf, sheetType, COLORS } from "../data/ingredients.js";
import layout from "../data/cakeLayout.json";

// 배치는 전부 cakeLayout.json 에 미리 계산돼 있다(손그림에서 실측한 윗면 타원 기준).
// 여기서는 계산하지 않고 자리만 찾아 그린다 — 개수가 늘어도 이미 올린 것이 움직이지 않는다.
const CANDLE_TYPES = Object.keys(layout.candle.size);
const COLOR_HEX = Object.fromEntries(COLORS.map((c) => [c.id, c.hex]));
export const MAX_CANDLES = Object.keys(layout.candle.arrangements).length;
export const TOPPING_SLOTS = layout.topping.slots.length;

/** 다음 토핑을 놓을 자리 — 남은 자리 중 무작위.
 *  add 시점에 자리를 고정해야 뒤에 더 올려도 이미 올린 토핑이 안 움직인다. */
export function pickToppingSlot(used) {
  const taken = new Set(used);
  const free = layout.topping.slots.map((_, i) => i).filter((i) => !taken.has(i));
  const pool = free.length ? free : layout.topping.slots.map((_, i) => i);
  return pool[Math.floor(Math.random() * pool.length)];
}

// 맛/색 변형은 클릭 때 처음 받으면 전환이 늦다. 한 번만 미리 받아둔다.
// (WebP 로 줄여 11색 × 2종이 다 합쳐 1MB 남짓 — 처음 한 번이면 충분하다)
let warmed = false;
function warmVariants() {
  if (warmed || typeof Image === "undefined") return;
  warmed = true;
  for (const c of Object.keys(COLOR_HEX)) {
    for (const p of [`/assets/cake_${c}.webp`, `/assets/cream_${c}.webp`]) {
      const im = new Image();
      im.src = p;
    }
  }
}

// preview 상태: "bowl-empty" | "bowl-dough" | "making" | "cake"
export default function CakeView({ cake, preview = "cake" }) {
  warmVariants();
  const sheet = cake.cakeBase || "vanilla";
  const cakeType = sheetType(cake.base) || "cake";

  const src =
    preview === "bowl-empty" ? "/assets/bowl_empty.webp"
    : preview === "bowl-dough" ? "/assets/bowl_dough.webp"
    : preview === "making" ? "/assets/dough_knead.webp"
    : `/assets/${cakeType}_${sheet}.webp`;
  const isCake = preview === "cake";

  // 생크림 — fill_order 앞에서부터. 몇 개를 올리든 링 전체에 고르게 퍼진다.
  const dollops = cake.cream?.dollops ?? [];
  const creamSlots = layout.cream.fill_order
    .slice(0, dollops.length)
    .map((i) => layout.cream.slots[i]);

  // 초 — 개수마다 배치가 통째로 다르다 (1개 정중앙 / 2개 수평 / 3개부터 원)
  const candles = (cake.deco ?? []).filter((d) => CANDLE_TYPES.includes(d.type));
  const candleSlots =
    layout.candle.arrangements[String(Math.min(candles.length, MAX_CANDLES))] ?? [];

  // 스프링클 — 한 번 올릴 때 per_click 알씩 통으로
  const clicks = (cake.deco ?? []).filter((d) => d.type === "sprinkle").length;
  const grains = layout.sprinkle.slots.slice(0, clicks * layout.sprinkle.per_click);

  const at = (p, deg = 0) => ({
    left: `${p.x * 100}%`,
    top: `${p.y * 100}%`,
    transform: `translate(-50%,-50%) rotate(${deg}deg)`,
  });

  return (
    <div className="cake-stage">
      <div className="cake">
        <img className="cake-base" src={src} alt="케이크" />

        {isCake &&
          creamSlots.map((p, i) => (
            <img
              key={"cr" + i}
              className="cake-item"
              src={`/assets/cream_${cake.cream.color || "vanilla"}.webp`}
              style={{ ...at(p), width: `${layout.cream.size * 100}%` }}
              alt=""
            />
          ))}

        {isCake &&
          (cake.toppings ?? []).map((t, i) => {
            const p = layout.topping.slots[(t.slot ?? i) % layout.topping.slots.length];
            return (
              <img
                key={"tp" + i}
                className="cake-item"
                src={`/assets/ing_${t.type}.webp`}
                style={{ ...at(p, p.deg), width: `${(layout.topping.size[t.type] ?? 0.09) * 100}%` }}
                alt=""
              />
            );
          })}

        {isCake &&
          grains.map((p, i) => (
            <img
              key={"sp" + i}
              className="cake-item"
              src={`/assets/${layout.sprinkle.grains[p.grain % layout.sprinkle.grains.length]}`}
              style={{ ...at(p, p.deg), width: `${3.2 * layout.sprinkle.scale}%` }}
              alt=""
            />
          ))}

        {/* 초는 세워 꽂는 물건이라 기준점이 바닥이다 — 중심을 맞추면 케이크에 파묻힌다 */}
        {isCake &&
          candles.map((d, i) => {
            const p = candleSlots[i];
            if (!p) return null;
            return (
              <img
                key={"kd" + i}
                className="cake-item cake-item--stand"
                src={`/assets/ing_${d.type}.webp`}
                style={{
                  left: `${p.x * 100}%`,
                  top: `${p.y * 100}%`,
                  width: `${(layout.candle.size[d.type] ?? 0.1) * 100}%`,
                }}
                alt=""
              />
            );
          })}

        {isCake && cake.lettering.text && (
          <span className="lettering-note">
            {/* 쪽지 컨셉(S16) — 글자를 크림으로 쓰는 게 아니라 쪽지에 써서 얹는다 */}
            <img src="/assets/note_open.webp" alt="" />
            <span className="lettering" style={{ color: hexOf(cake.lettering.color) }}>
              {cake.lettering.text}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
