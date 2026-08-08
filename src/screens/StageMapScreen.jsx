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

// 노드 배치 — 마을 그림(bg_stage1, 1024×1536) 안 노란 길 위 좌표. 아래→위 순서.
// %는 화면이 아니라 **그림** 기준이다. 그림의 길 중심선을 픽셀로 훑어 잡았고,
// .stage-canvas 가 1024:1536 비율을 지키므로 화면이 커져도 노드는 길에 붙어 있다.
// 최상단이 top 20% 였을 때 「Stage 1」 헤더 카드에 덮였다 (QA7 / KAN-57).
// 헤더를 피해 27% 까지 내리고, 다섯 개를 88%~27% 사이에 균등 재배분했다.
const NODE_OFFSETS = [
  { left: "50%", top: "88%" },
  { left: "68%", top: "73%" },
  { left: "49%", top: "58%" },
  { left: "45%", top: "44%" },
  { left: "43%", top: "29%" },
];

export default function StageMapScreen({ stars, onSelect, onFinish }) {
  // 손님을 다 만나면 맵에서 바로 영업을 종료할 수 있어야 한다 — 없으면 전원 클리어 뒤
  // 맵에 들어온 순간(결과 화면의 '맵 보기', 설정 팝업의 '맵으로') 엔딩으로 나갈 길이 사라진다 (S33).
  const allCleared = stars.every((v) => v > 0);

  return (
    <div className="layer-frame stage-frame">
      {/* 마을 그림 + 그 위 노드 — 둘이 같은 캔버스 안이라 같이 늘고 준다 */}
      <div className="stage-art">
        <div className="stage-canvas">
          {orders.map((order, i) => {
            const state = nodeState(i, stars);
            const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;

            return (
              <div
                key={order.id}
                className={`stage-node stage-node--${state}`}
                style={NODE_OFFSETS[i] ?? NODE_OFFSETS[NODE_OFFSETS.length - 1]}
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

                {/* 별점 (완료 노드) — 맵·정산·클리어 공용 Stars (H14) */}
                {state === "done" && <Stars value={stars[i]} className="stage-star-icon" />}

                {/* 현재 노드 표시 */}
                {state === "now" && <span className="stage-now-label">지금!</span>}

                {/* 잠긴 노드 번호 */}
                {state === "locked" && <span className="stage-lock-num">{i + 1}</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="stage-header">
        <h1 className="stage-title">Stage 1</h1>
        <p className="stage-sub">뭉게뭉게 마을 · 손님 {orders.length}명 · 튜토리얼</p>
      </div>

      {/* ⚠ 제목 뒤에 와야 한다 — margin-top:auto 가 위 여백을 다 먹어서, 앞에 두면 제목까지 바닥으로 끌고 간다 */}
      {allCleared && onFinish && (
        <div className="stage-finish">
          <button className="btn" onClick={onFinish}>영업 종료 →</button>
        </div>
      )}
    </div>
  );
}
