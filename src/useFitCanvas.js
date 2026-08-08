import { useLayoutEffect, useRef } from "react";

// BUILD 캔버스를 화면 '폭'에 맞춘다 (QA2 / KAN-52).
// 이 캔버스는 폭 390 기준으로 배경(작업대·앞치마)과 콘텐츠(보울·팔레트)를 픽셀 단위로
// 맞춰 둔 무대라, 재배치가 아니라 통째 균등 배율로만 맞춘다.
// 배율은 폭으로만 정한다 — 세로 기준으로도 줄이면 캔버스가 셸보다 좁아져
// 위·옆에 배경 빈틈이 드러난다(2026-08-08 확인). 세로가 모자라면 축소 대신 스크롤.
const STAGE_W = 390; // 무대 기준 폭 (styles.css 의 .screen--canvas width 와 짝)
const MIN_FIT = 0.8; // 안전 바닥 — 재료 칩·글자가 읽히는 하한

export default function useFitCanvas(screen) {
  const shellRef = useRef(null);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const apply = () => {
      const canvas = shell.querySelector(".screen--canvas");
      if (!canvas) {
        shell.style.removeProperty("--fit");
        shell.classList.remove("shell--scroll");
        return;
      }
      // 기준 상태(배율 1, 원래 높이)로 되돌려 재야 배율이 겹으로 적용되지 않는다
      shell.style.setProperty("--fit", "1");
      canvas.style.height = "";
      const baseH = parseFloat(getComputedStyle(canvas).height); // 무대 기준 높이 (748)

      const fit = Math.max(MIN_FIT, shell.clientWidth / STAGE_W);
      shell.style.setProperty("--fit", String(fit));
      // 레이아웃 높이도 같은 배율로 — transform 은 레이아웃을 안 바꾸므로, 안 맞추면
      // 중앙정렬(margin:auto)이 옛 높이로 계산되고 스크롤 길이도 어긋난다
      canvas.style.height = `${Math.round(baseH * fit)}px`;

      // 세로가 모자라면(무대가 컨테이너보다 크면) 그 구간만 스크롤을 연다
      const keep = canvas.closest(".build-keep");
      shell.classList.toggle(
        "shell--scroll",
        !!keep && baseH * fit > keep.clientHeight + 1
      );
    };

    apply();
    window.addEventListener("resize", apply);
    // 주소창 접힘·회전 등으로 dvh 가 바뀌는 경우
    window.visualViewport?.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("resize", apply);
    };
  }, [screen]);

  return shellRef;
}
