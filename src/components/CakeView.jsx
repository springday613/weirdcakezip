import { useRef, useEffect } from "react";
import { sheetType, COLORS } from "../data/ingredients.js";
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
  // 쪽지 2장도 미리 — 접는 연출이 0.3초뿐이라, 그 순간 처음 받으면 접힌 컷을 못 보고 지나간다
  for (const p of ["/assets/note_open.webp", "/assets/note_closed.webp"]) {
    const im = new Image();
    im.src = p;
  }
}

// position wrapper — translate·rotate 를 transform 문자열로 묶어 WebView 104 미만도 지원.
// ing-pop 의 transform:scale() 은 안쪽 img 에만 걸려서 합성이 정상이다.
const slotAt = (p, deg = 0) => ({
  position: "absolute",
  left: `${p.x * 100}%`,
  top: `${p.y * 100}%`,
  transform: `translate(-50%, -50%)${deg ? ` rotate(${deg}deg)` : ""}`,
});
const standAt = (p) => ({
  position: "absolute",
  left: `${p.x * 100}%`,
  top: `${p.y * 100}%`,
  transform: "translate(-50%, -100%)",
});

const ING_POP_MS = 240;

// preview 상태: "bowl-empty" | "bowl-dough" | "making" | "cake" | "note" | "note-folded"
// notePlacement: "top"(기본, 케이크 위에 얹기) | "beside"(결과 화면 — 접힌 쪽지를 케이크 옆에)
export default function CakeView({ cake, preview = "cake", notePlacement = "top" }) {
  warmVariants();
  const sheet = cake.cakeBase || "vanilla";
  const cakeType = sheetType(cake.base) || "cake";

  const src =
    preview === "bowl-empty" ? "/assets/bowl_empty.webp"
    : preview === "bowl-dough" ? "/assets/bowl_dough.webp"
    : preview === "making" ? "/assets/dough_knead.webp"
    : `/assets/${cakeType}_${sheet}.webp`;
  const isCake = preview === "cake";

  const dollops = cake.cream?.dollops ?? [];
  const toppings = cake.toppings ?? [];
  const allDeco = cake.deco ?? [];
  const candles = allDeco.filter((d) => CANDLE_TYPES.includes(d.type));
  const sprinkleClicks = allDeco.filter((d) => d.type === "sprinkle").length;
  const grainCount = sprinkleClicks * layout.sprinkle.per_click;

  const counts = { cream: dollops.length, topping: toppings.length, candle: candles.length, sprinkle: sprinkleClicks };

  // E7: mount 시점의 개수로 시드 — fresh mount(CONFIRM·RESULT)에서 전부 pop 되지 않게.
  // committedCounts: 애니메이션(240ms)이 끝난 뒤에만 갱신해서, 연타해도 앞 아이템의 pop이 안 끊긴다.
  const committedCounts = useRef(counts);
  const latestCounts = useRef(counts);
  const popTimerRef = useRef(null);
  latestCounts.current = counts;

  const isNewCream = (i) => i >= committedCounts.current.cream;
  const isNewTopping = (i) => i >= committedCounts.current.topping;
  const isNewCandle = (i) => i >= committedCounts.current.candle;
  const isNewGrain = (i) => i >= committedCounts.current.sprinkle * layout.sprinkle.per_click;

  useEffect(() => {
    const c = committedCounts.current;
    const increased = counts.cream > c.cream || counts.topping > c.topping ||
      counts.candle > c.candle || counts.sprinkle > c.sprinkle;
    const decreased = counts.cream < c.cream || counts.topping < c.topping ||
      counts.candle < c.candle || counts.sprinkle < c.sprinkle;

    if (decreased) {
      // clearBoard / 실행취소 — 즉시 동기화
      committedCounts.current = { ...counts };
      clearTimeout(popTimerRef.current);
    } else if (increased) {
      clearTimeout(popTimerRef.current);
      popTimerRef.current = setTimeout(() => {
        committedCounts.current = { ...latestCounts.current };
      }, ING_POP_MS);
    }
  });

  useEffect(() => {
    return () => clearTimeout(popTimerRef.current);
  }, []);

  // 쪽지 쓰기 모드 — 케이크 대신 펼친 쪽지가 무대를 차지한다 (S16)
  if (preview === "note") {
    return (
      <div className="cake-stage">
        <div className="note-stage">
          <img src="/assets/note_open.webp" alt="쪽지" />
          {/* 6글자 단위 줄바꿈 — 입력은 12자 제한이라 최대 2줄 */}
          <span className="note-text">
            {(cake.lettering.text || "…").match(/.{1,6}/g)?.join("\n")}
          </span>
        </div>
      </div>
    );
  }

  // 완성 직전 — 쪽지를 접는 연출(0.3초). 글자는 접혀서 안 보인다.
  if (preview === "note-folded") {
    return (
      <div className="cake-stage">
        <div className="note-stage note-stage--folded">
          <img src="/assets/note_closed.webp" alt="접힌 쪽지" />
        </div>
      </div>
    );
  }

  // 생크림 — fill_order 앞에서부터. 몇 개를 올리든 링 전체에 고르게 퍼진다.
  const creamSlots = layout.cream.fill_order
    .slice(0, dollops.length)
    .map((i) => layout.cream.slots[i]);

  // 초 — 개수마다 배치가 통째로 다르다 (1개 정중앙 / 2개 수평 / 3개부터 원)
  const candleSlots =
    layout.candle.arrangements[String(Math.min(candles.length, MAX_CANDLES))] ?? [];

  // 스프링클 — 한 번 올릴 때 per_click 알씩 통으로
  const grains = layout.sprinkle.slots.slice(0, grainCount);

  return (
    <div className="cake-stage">
      {/* 구도 미세조정 — 완성 케이크·보울·반죽 손을 각각 배경(매트)에 맞춘다 */}
      <div className={"cake" + (isCake ? " cake--baked" : preview.startsWith("bowl") ? " cake--bowl" : preview === "making" ? " cake--making" : "")}>
        <img className="cake-base" src={src} alt="케이크" />

        {isCake &&
          creamSlots.map((p, i) => (
            <span key={"cr" + i} className="cake-slot" style={{ ...slotAt(p), width: `${layout.cream.size * 100}%` }}>
              <img
                className={"cake-item" + (isNewCream(i) ? " ing-pop" : "")}
                src={`/assets/cream_${cake.cream.color || "vanilla"}.webp`}
                alt=""
              />
            </span>
          ))}

        {isCake &&
          toppings.map((t, i) => {
            const p = layout.topping.slots[(t.slot ?? i) % layout.topping.slots.length];
            return (
              <span key={"tp" + i} className="cake-slot" style={{ ...slotAt(p, p.deg), width: `${(layout.topping.size[t.type] ?? 0.09) * 100}%` }}>
                <img
                  className={"cake-item" + (isNewTopping(i) ? " ing-pop" : "")}
                  src={`/assets/ing_${t.type}.webp`}
                  alt=""
                />
              </span>
            );
          })}

        {isCake &&
          grains.map((p, i) => (
            <span key={"sp" + i} className="cake-slot" style={{ ...slotAt(p, p.deg), width: `${3.2 * layout.sprinkle.scale}%` }}>
              <img
                className={"cake-item" + (isNewGrain(i) ? " ing-pop" : "")}
                src={`/assets/${layout.sprinkle.grains[p.grain % layout.sprinkle.grains.length]}`}
                alt=""
              />
            </span>
          ))}

        {/* 초는 세워 꽂는 물건이라 기준점이 바닥이다 — 중심을 맞추면 케이크에 파묻힌다 */}
        {isCake &&
          candles.map((d, i) => {
            const p = candleSlots[i];
            if (!p) return null;
            return (
              <span key={"kd" + i} className="cake-slot cake-slot--stand" style={{ ...standAt(p), width: `${(layout.candle.size[d.type] ?? 0.1) * 100}%` }}>
                <img
                  className={"cake-item" + (isNewCandle(i) ? " ing-pop" : "")}
                  src={`/assets/ing_${d.type}.webp`}
                  alt=""
                />
              </span>
            );
          })}

        {isCake && cake.lettering.text && notePlacement === "top" && (
          <span className="lettering-note">
            {/* 쪽지 컨셉(S16) — 글자를 크림으로 쓰는 게 아니라 쪽지에 써서 얹는다 */}
            <img src="/assets/note_open.webp" alt="" />
            <span className="lettering">{cake.lettering.text}</span>
          </span>
        )}

        {/* 결과 화면 — 함께 배달된 접힌 쪽지를 케이크 옆에 놓는다. 안 썼으면 쪽지도 없다 */}
        {isCake && cake.lettering.text && notePlacement === "beside" && (
          <img className="note-beside" src="/assets/note_closed.webp" alt="쪽지" />
        )}
      </div>
    </div>
  );
}
