import Img from "../components/Img.jsx";
import { soundManager } from "../utils/soundManager.js";

export default function TitleScreen({ onStart }) {
  const handleDown = () => soundManager.playSfx("start");

  return (
    <>
      {/* 기본 배경(구름 하늘) — 로고·버튼 층 아래에 깐다 */}
      <div className="screen-bg" />
      <div className="layer-asset title-assets">
        <Img src="/assets/logo.webp" className="title-logo" alt="weirdcakezip" />
      </div>
      <div className="layer-ui title-ui">
        <p className="title-tagline">
          애매한 주문 속 진짜 마음을 읽고,
          <br />
          케이크를 만들어 주세요
        </p>
        <button className="btn-primary" data-sfx="start" onMouseDown={handleDown} onTouchStart={handleDown} onClick={onStart}>
          가게 열기
        </button>
        {/* '이어하기' 제거 (S30) — 저장 기능이 없어 영원히 비활성이라 미완성으로 읽혔다 */}
      </div>
    </>
  );
}
