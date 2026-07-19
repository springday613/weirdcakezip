export default function TitleScreen({ onStart }) {
  return (
    <div className="screen center">
      <img className="logo" src="/assets/logo.png" alt="weirdcakezip" />
      <p>애매한 주문 속 진짜 마음을 읽고, 케이크를 만들어 주세요.</p>
      <button className="btn" onClick={onStart}>
        가게 열기 🍰
      </button>
    </div>
  );
}
