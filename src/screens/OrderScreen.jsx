import CakeView from "../components/CakeView.jsx";
import IngredientPalette from "../components/IngredientPalette.jsx";
import ChatBox from "../components/ChatBox.jsx";
import { MONSTERS } from "../data/ingredients.js";

export default function OrderScreen({ order, index, total, cake, setCake, onSubmit, busy }) {
  const monster = MONSTERS[order.monster] ?? MONSTERS.blue;

  // 케이크 위 클릭 → 선택된 토핑/데코를 그 좌표에 배치 (드래그 대신 좌표 클릭)
  function place(placing, x, y) {
    const item = { type: placing.type, x, y };
    if (placing.kind === "deco") setCake({ ...cake, deco: [...cake.deco, item] });
    else setCake({ ...cake, toppings: [...cake.toppings, item] });
  }
  const sheetReady = cake.base.length > 0 && cake.sheetColor;
  const clearBoard = () => setCake({ ...cake, toppings: [], deco: [] });
  const resetAll = () =>
    setCake({ base: [], sheetColor: null, cream: null, toppings: [], deco: [], lettering: { text: "", color: null } });

  return (
    <div className="screen">
      <div className="hud">
        주문 {index + 1} / {total}
      </div>

      <div className="monster-bar" style={{ background: monster.color }}>
        <span className="monster-face">{monster.emoji}</span>
        <span>손님과 대화해서 원하는 케이크를 알아내세요</span>
      </div>

      {/* 애매한 주문은 대화로 푼다 (런타임 LLM) */}
      <ChatBox order={order} />

      <CakeView cake={cake} onPlace={place} />

      <IngredientPalette cake={cake} setCake={setCake} />

      <div className="edit-row">
        <button className="chip ghost" onClick={clearBoard}>🧹 케이크 위 지우기</button>
        <button className="chip ghost" onClick={resetAll}>↺ 처음부터 만들기</button>
      </div>

      <button className="btn submit" onClick={onSubmit} disabled={busy || !sheetReady}>
        {busy ? "괴물이 살펴보는 중..." : "만들기 🎂"}
      </button>
      {!sheetReady && <p className="hint">시트 재료를 섞고 색을 골라주세요.</p>}
    </div>
  );
}
