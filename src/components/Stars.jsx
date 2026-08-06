import Icon from "./Icon.jsx";

// 별점 타이밍 상수 — CoinCount 가 카운트업 시작 시점을 맞출 때 쓴다
export const STAR_STEP_MS = 120;
export const STAR_POP_MS = 360;
export function starAnimEnd(count) {
  return Math.max(0, count - 1) * STAR_STEP_MS + STAR_POP_MS;
}

// 별점 컴포넌트 — 맵·정산·클리어가 공유한다. 두 벌로 두면 별 모양이 갈라진다.
// className: 개별 아이콘 박스에 붙는 추가 클래스 (StageMapScreen 의 stage-star-icon 등)
// animate: true 면 순차 등장 애니메이션. 정산·클리어에서만 true 로 넘긴다.
export default function Stars({ value = 0, max = 5, size = "sm", className = "", animate = false }) {
  return (
    <div className="stars">
      {Array.from({ length: max }, (_, i) => {
        const filled = i + 1 <= value;
        return (
          <Icon
            key={i + 1}
            name={filled ? "star" : "star-empty"}
            size={size}
            className={
              (animate && filled ? "star-icon " : "") + className
            }
            style={animate && filled ? { "--i": i } : undefined}
          />
        );
      })}
    </div>
  );
}
