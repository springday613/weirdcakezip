import { useRef } from "react";
import { TOPPINGS, DECO, hexOf, emojiOf } from "../data/ingredients.js";

// cake 상태 → 이미지 레이어 렌더 (Canvas 없이 DOM 절대배치).
// 지금은 색+이모지 플레이스홀더. 손그림 PNG로 교체해도 이 구조 그대로.
export default function CakeView({ cake, onPlace }) {
  const ref = useRef(null);

  function handleClick(e) {
    if (!onPlace || !cake._placing) return;
    const rect = ref.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    onPlace(cake._placing, x, y);
  }

  const sheetHex = cake.sheetColor ? hexOf(cake.sheetColor) : "#f5efe6";
  const emoji = (type) =>
    emojiOf(TOPPINGS, type) !== "•" ? emojiOf(TOPPINGS, type) : emojiOf(DECO, type);

  return (
    <div className="cake-stage">
      <div
        className="cake"
        ref={ref}
        onClick={handleClick}
        style={{ background: sheetHex }}
        title={cake._placing ? "케이크를 클릭해 올리기" : ""}
      >
        {cake.cream && (
          <div className="cream" style={{ background: hexOf(cake.cream.color) }} />
        )}
        {[...cake.toppings, ...cake.deco].map((t, i) => (
          <span key={i} className="topping" style={{ left: `${t.x}%`, top: `${t.y}%` }}>
            {emoji(t.type)}
          </span>
        ))}
        {cake.lettering.text && (
          <span className="lettering" style={{ color: hexOf(cake.lettering.color) }}>
            {cake.lettering.text}
          </span>
        )}
      </div>
    </div>
  );
}
