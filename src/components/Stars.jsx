import Icon from "./Icon.jsx";

// 별점 컴포넌트 — 맵·정산·클리어가 공유한다. 두 벌로 두면 별 모양이 갈라진다.
// className: 개별 아이콘 박스에 붙는 추가 클래스 (StageMapScreen 의 stage-star-icon 등)
export default function Stars({ value = 0, max = 5, size = "sm", className = "" }) {
  return (
    <div className="stars">
      {Array.from({ length: max }, (_, i) => (
        <Icon
          key={i + 1}
          name={i + 1 <= value ? "star" : "star-empty"}
          size={size}
          className={className}
        />
      ))}
    </div>
  );
}
