import { orders } from "../data/orders.js";
import { MONSTERS } from "../data/ingredients.js";
import Img from "../components/Img.jsx";
import Icon from "../components/Icon.jsx";
import Stars from "../components/Stars.jsx";

// 노드 상태: done(별점 있음) | now(현재 플레이할 차례) | locked(잠김)
function nodeState(i, stars) {
  if (stars[i] > 0) return "done";
  if (i === 0 || stars[i - 1] > 0) return "now";
  return "locked";
}

// 노드 배치 — 지그재그 패턴 (아래→위, 왼쪽↔오른쪽)
const NODE_OFFSETS = [
  { left: "20%" },
  { left: "30%" },
  { left: "45%" },
  { left: "55%" },
  { left: "65%" },
];

export default function StageMapScreen({ stars, onSelect }) {
  return (
    <>
      {/* layer-frame: 노드 원 + 길 점 — 괴물 그림 뒤 */}
      <div className="layer-frame stage-frame">
        <div className="stage-header">
          <h1 className="stage-title">Stage 1</h1>
          <p className="stage-sub">괴물 마을 · 손님 {orders.length}명 · 튜토리얼</p>
        </div>

        <div className="stage-path">
          {orders.map((order, i) => {
            const state = nodeState(i, stars);
            const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;

            return (
              <div key={order.id} className="stage-row">
                {/* 노드 사이 점선 (첫 노드 제외) */}
                {i > 0 && (
                  <div className="stage-dots" style={{ left: NODE_OFFSETS[i]?.left }}>
                    <span className="stage-dot" />
                    <span className="stage-dot" />
                    <span className="stage-dot" />
                    <span className="stage-dot" />
                  </div>
                )}

                <div
                  className={`stage-node stage-node--${state}`}
                  style={{ left: NODE_OFFSETS[i]?.left }}
                >
                  <button
                    className={`stage-circle stk ${state === "now" ? "stage-circle--now" : ""}`}
                    disabled={state === "locked"}
                    onClick={() => state !== "locked" && onSelect(i)}
                    aria-label={`${order.monster} ${state}`}
                  >
                    {state === "locked" ? (
                      <Icon name="lock" size="md" />
                    ) : (
                      <Img
                        src={monster.img[state === "done" ? "happy" : "normal"]}
                        className="stage-monster"
                        alt={monster.name}
                      />
                    )}
                  </button>

                  {/* 별점 (완료 노드) */}
                  {state === "done" && (
                    <Stars value={stars[i]} className="stage-star-icon" />
                  )}

                  {/* 현재 노드 표시 */}
                  {state === "now" && <span className="stage-now-label">지금!</span>}

                  {/* 잠긴 노드 번호 */}
                  {state === "locked" && <span className="stage-lock-num">{i + 1}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
