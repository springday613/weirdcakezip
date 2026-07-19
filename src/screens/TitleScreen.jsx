export default function TitleScreen({ onStart }) {
  return (
    <div className="screen center">
      <h1>괴물 세상의 케이크 가게</h1>
      <p>애매한 주문 속 진짜 마음을 읽고, 케이크를 만들어 주세요.</p>
      <button className="btn" onClick={onStart}>
        가게 열기 🍰
      </button>
    </div>
  );
}
