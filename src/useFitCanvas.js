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
        shell.style.removeProperty("--stage-w"); // HUD 폭 제한도 함께 해제 (BUILD 밖에선 전폭)
        shell.classList.remove("shell--scroll");
        shell.classList.remove("shell--build"); // 상단 고정바 (BUILD 전용)
        return;
      }
      shell.classList.add("shell--build");
      // 기준 상태(배율 1, 원래 높이)로 되돌려 재야 배율이 겹으로 적용되지 않는다
      shell.style.setProperty("--fit", "1");
      canvas.style.height = "";
      const cs = getComputedStyle(canvas);
      const baseH = parseFloat(cs.height); // 무대 기준 높이 (748)
      const shift = parseFloat(cs.getPropertyValue("--canvas-shift")) || 0;

      const keep = canvas.closest(".build-keep");
      const top = canvas.getBoundingClientRect().top;
      const last = canvas.lastElementChild;
      const need = (last ? last.getBoundingClientRect().bottom : top + baseH) - top;
      const avail = (keep ? keep.getBoundingClientRect().bottom : window.innerHeight) - top;

      const widthFit = shell.clientWidth / STAGE_W;
      // 세로 배율: translateY(--canvas-shift × fit) 가 시작점도 끌어내리므로 그 항까지 넣어 푼다.
      //   bottom(fit) = top - shift + (need + shift) × fit ≤ top + avail → fit ≤ (avail+shift)/(need+shift)
      const heightFit = avail > 0 ? (avail + shift) / (need + shift) : widthFit;
      // 세로에 맞춰 줄이되(상한 = 폭 배율), 바닥(MIN_FIT) 아래로는 줄이지 않는다 — 그 밑은 스크롤
      const fit = Math.max(MIN_FIT, Math.min(widthFit, heightFit));
      shell.style.setProperty("--fit", String(fit));
      // 우드 밴드 fill 폭 — 배경 그림(::before)은 캔버스보다 좌우로 넓다(-12px 블리드).
      // 몸통 폭(390)이 아니라 그림 폭에 맞춰야 결·가장자리가 정확히 이어진다.
      const artW = parseFloat(getComputedStyle(canvas, "::before").width) || STAGE_W;
      shell.style.setProperty("--stage-w", `${Math.round(artW * fit)}px`);

      // 바닥까지 줄이고도 안 들어가면 그 구간만 스크롤을 연다.
      // 스크롤 모드에선 구도 하향(translateY)을 끈다(styles.css) — 켜 두면 스크롤러가
      // 캔버스 위로 뻗은 배경을 잘라 위쪽에 틈이 생기고, 맨 위로 올려도 상단이 안 보인다.
      const scrollNeeded = (need + shift) * fit - shift > avail + 1;
      shell.classList.toggle("shell--scroll", scrollNeeded);
      // 레이아웃 높이도 같은 배율로 — transform 은 레이아웃을 안 바꾸므로, 안 맞추면
      // 중앙정렬(margin:auto)이 옛 높이로 계산되고 스크롤 길이도 어긋난다.
      // 스크롤 모드에선 내용 높이만큼만 — 무대 상자(748) 그대로면 바닥에 빈 꼬리가 남는다.
      canvas.style.height = `${Math.round((scrollNeeded ? need : baseH) * fit)}px`;
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
