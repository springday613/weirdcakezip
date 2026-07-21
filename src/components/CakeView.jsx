import { useRef } from "react";
import { TOPPINGS, DECO, hexOf, emojiOf, sheetType } from "../data/ingredients.js";

// preview 상태: "bowl-empty" | "bowl-dough" | "making" | "cake"
export default function CakeView({ cake, preview = "cake", onPlace }) {
  const ref = useRef(null);
  const sheet = cake.sheetColor || "vanilla";
  const cakeType = sheetType(cake.base) || "cake";

  const src =
    preview === "bowl-empty" ? "/assets/bowl_empty.png"
    : preview === "bowl-dough" ? `/assets/dough_${sheet}.png`
    : preview === "making" ? "/assets/bowl_making.png"
    : `/assets/${cakeType}_${sheet}.png`;
  const isCake = preview === "cake";

  function handleClick(e) {
    if (!onPlace || !cake._placing) return;
    const rect = ref.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    onPlace(cake._placing, x, y);
  }
  const emoji = (type) =>
    emojiOf(TOPPINGS, type) !== "•" ? emojiOf(TOPPINGS, type) : emojiOf(DECO, type);

  return (
    <div className="cake-stage">
      <div className="cake" ref={ref} onClick={handleClick}>
        <img className="cake-base" src={src} alt="케이크" />
        {isCake &&
          (cake.cream?.dollops ?? []).map((d, i) => (
            <img
              key={"cr" + i}
              className="cream-dollop"
              src={`/assets/cream_${cake.cream.color || "vanilla"}.png`}
              style={{ left: `${d.x}%`, top: `${d.y}%` }}
              alt=""
            />
          ))}
        {isCake &&
          [...cake.toppings, ...cake.deco].map((t, i) => (
            <img
              key={i}
              className="topping"
              src={t.type === "sprinkle" ? "/assets/ing_sprinkle_on.png" : `/assets/ing_${t.type}.png`}
              style={{ left: `${t.x}%`, top: `${t.y}%` }}
              alt=""
            />
          ))}
        {isCake && cake.lettering.text && (
          <span className="lettering" style={{ color: hexOf(cake.lettering.color) }}>
            {cake.lettering.text}
          </span>
        )}
      </div>
    </div>
  );
}
