import { useState } from "react";

/**
 * 아이콘 래퍼 — 폴백 순서:
 *   ui_{name}.svg → 임시 CSS/SVG 도형 → 빈칸
 *
 * 나중에 public/assets/ui_{name}.svg 를 넣으면 코드 수정 없이 교체된다.
 * SVG 로드 실패는 모듈 레벨 Set에 캐시해서 같은 이름의 404를 반복하지 않는다.
 */

const _svgMissing = new Set();

const SHAPE_FALLBACKS = {
  heart: (size, color) => (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
           2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
           C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
           c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={color || "var(--heart)"}
        stroke="var(--ink)"
        strokeWidth="1.2"
      />
    </svg>
  ),
  coin: (size, color) => (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <circle cx="12" cy="12" r="10" fill={color || "var(--coin)"} stroke="var(--ink)" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="5" fill="none" stroke="var(--ink)" strokeWidth="1" />
    </svg>
  ),
  star: (size, color) => (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={color || "var(--star)"}
        stroke="var(--ink)"
        strokeWidth="1.2"
      />
    </svg>
  ),
  "star-empty": (size) => (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill="var(--star-empty)"
        stroke="var(--ink)"
        strokeWidth="1.2"
      />
    </svg>
  ),
  lock: (size) => (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <rect x="5" y="11" width="14" height="10" rx="2" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="var(--ink)" strokeWidth="1.2" />
    </svg>
  ),
  retry: (size) => (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path
        d="M17.65 6.35A7.96 7.96 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8
           c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6
           s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
        fill="var(--ink)"
      />
    </svg>
  ),
  "sound-on": (size) => (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path d="M3 9v6h4l5 5V4L7 9H3z" fill="var(--ink)" />
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" fill="var(--ink)" />
      <path d="M19 12c0 2.97-1.65 5.54-4 6.71v2.06c3.45-1.28 6-4.64 6-8.77s-2.55-7.49-6-8.77v2.06c2.35 1.17 4 3.74 4 6.71z" fill="var(--ink)" opacity=".5" />
    </svg>
  ),
  "sound-off": (size) => (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path d="M3 9v6h4l5 5V4L7 9H3z" fill="var(--ink)" opacity=".4" />
      <line x1="18" y1="9" x2="14" y2="15" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="9" x2="18" y2="15" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  // 음표 — 음악 토글용 (S29). ui_music.svg 를 넣으면 코드 수정 없이 교체된다.
  music: (size) => (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path d="M9 18V6l10-2v12" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="7" cy="18" rx="2.6" ry="2.2" fill="var(--ink)" />
      <ellipse cx="17" cy="16" rx="2.6" ry="2.2" fill="var(--ink)" />
    </svg>
  ),
  menu: (size) => (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      {/* 톱니바퀴 (QA16 / KAN-66) — 설정 팝업을 여는 버튼이라 햄버거보다 톱니가 맞다 */}
      <path
        d="M19.4 13a7.6 7.6 0 0 0 .06-1c0-.34-.02-.67-.06-1l2.03-1.58a.5.5 0 0 0 .12-.63l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.4.96a7.3 7.3 0 0 0-1.73-1l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.63.26-1.2.6-1.73 1l-2.4-.96a.5.5 0 0 0-.6.22L2.7 8.79a.5.5 0 0 0 .12.63L4.85 11c-.04.33-.06.66-.06 1s.02.67.06 1l-2.03 1.58a.5.5 0 0 0-.12.63l1.92 3.32c.13.22.39.31.6.22l2.4-.96c.53.4 1.1.74 1.73 1l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54a7.3 7.3 0 0 0 1.73-1l2.4.96c.21.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.63L19.4 13zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"
        fill="var(--ink)"
      />
    </svg>
  ),
  chat: (size) => (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path
        d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
        fill="var(--paper)"
        stroke="var(--ink)"
        strokeWidth="1.2"
      />
    </svg>
  ),
};

const SIZE_MAP = { sm: 20, md: 28, lg: 36 };

export default function Icon({ name, size = "sm", color, className = "", alt = "", style }) {
  // name 이 바뀌면 자동 추종 — Set에서 매 렌더 파생시킨다
  const [, bump] = useState(0);
  const useFallback = _svgMissing.has(name);
  const px = SIZE_MAP[size] || SIZE_MAP.sm;
  const sizeClass = `icon-box icon-box--${size}`;

  // SVG 파일이 있으면 그걸 쓴다
  if (!useFallback) {
    return (
      <span className={`${sizeClass} ${className}`} style={style}>
        <img
          src={`/assets/ui_${name}.svg`}
          alt={alt}
          width={px}
          height={px}
          onError={() => {
            _svgMissing.add(name);
            bump((n) => n + 1);
          }}
          style={{ display: "block" }}
        />
      </span>
    );
  }

  // 임시 CSS/SVG 도형
  const fallback = SHAPE_FALLBACKS[name];
  if (fallback) {
    return (
      <span className={`${sizeClass} ${className}`} style={style}>
        {fallback(px, color)}
      </span>
    );
  }

  // 빈칸
  return <span className={`${sizeClass} ${className}`} style={style} />;
}
