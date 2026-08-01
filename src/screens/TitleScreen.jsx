import Img from "../components/Img.jsx";

export default function TitleScreen({ onStart }) {
  return (
    <>
      <div className="layer-asset title-assets">
        <Img src="/assets/logo.webp" className="title-logo" alt="weirdcakezip" />
      </div>
      <div className="layer-ui title-ui">
        <p className="title-tagline">
          애매한 주문 속 진짜 마음을 읽고,
          <br />
          케이크를 만들어 주세요
        </p>
        <button className="btn-primary" onClick={onStart}>
          가게 열기
        </button>
        <button className="btn-ghost" disabled>
          이어하기
        </button>
        <p className="title-caption">저장된 진행이 없습니다</p>
      </div>
    </>
  );
}
