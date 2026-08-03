import { useState } from "react";

/**
 * 에셋 이미지 래퍼 — 없으면 자리를 차지하는 빈 박스.
 *
 * - src 가 없거나 로드 실패 시 .img-empty 빈 박스를 렌더한다.
 * - 크기는 className 의 width + aspect-ratio 로 잡는다.
 *   size prop 은 폭(px)만 지정한다 (높이는 auto).
 */
export default function Img({ src, alt = "", size, className = "", style = {}, ...rest }) {
  const [failed, setFailed] = useState(false);

  const fitStyle = size
    ? { width: `${size}px`, objectFit: "contain", ...style }
    : { objectFit: "contain", ...style };

  if (!src || failed) {
    return <span className={`img-empty ${className}`} style={fitStyle} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={fitStyle}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
