import { useLayoutEffect, useRef } from "react";

// BUILD 캔버스를 화면 세로에 맞춘다 (QA2 / KAN-52).
// 이 캔버스는 748px 기준으로 픽셀 단위로 맞춰 둔 구도라 재배치가 아니라 '통째로 축소'로 맞춘다.
// 세로가 넉넉하면 배율 1 — 기존 화면과 완전히 같다. 짧은 기기에서만 줄어든다.
const BOTTOM_GAP = 8; // 맨 아래 편집줄과 화면 끝 사이 최소 여백
const STAGE_W = 390; // 무대 기준 폭 — 배경·콘텐츠 구도를 맞춰 둔 폭 (styles.css 의 .screen--canvas width 와 짝)
// 축소 바닥 — 이보다 더 줄이면 재료 칩·글자가 못 읽을 만큼 작아진다.
// 바닥에 닿고도 안 들어가는 화면에서는 더 줄이지 않고 스크롤로 넘긴다.
const MIN_FIT = 0.8;

export default function useFitCanvas(screen) {
  const shellRef = useRef(null);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const apply = () => {
      const canvas = shell.querySelector(".screen--canvas");
      if (!canvas) {
        shell.style.removeProperty("--fit");
        return;
      }
      // 먼저 원래 크기로 되돌려 재야 한다 — 줄어든 상태에서 재면 배율이 계속 작아진다
      shell.style.setProperty("--fit", "1");
      const top = canvas.getBoundingClientRect().top;
      // 캔버스는 콘텐츠보다 아래가 남는 고정 상자라, 상자가 아니라 '마지막 자식'까지를 잰다
      const last = canvas.lastElementChild;
      const need = (last ? last.getBoundingClientRect().bottom : canvas.getBoundingClientRect().bottom) - top;
      const avail = window.innerHeight - top - BOTTOM_GAP;
      if (need <= 0 || avail <= 0) return;
      // 폭 배율: 캔버스는 390px 무대 — 셸이 더 넓으면 키우고 좁으면 줄인다(구도 유지 = 균등 배율).
      // 최종 배율은 폭·세로 중 작은 쪽. 둘 다 넉넉하면 폭에 맞춰 화면을 채운다.
      const widthFit = shell.clientWidth / STAGE_W;
      // 세로 배율: translateY(--canvas-shift × fit) 가 시작점도 끌어내리므로 그 항까지 넣어 푼다.
      //   bottom(fit) = top - shift + (need + shift) × fit ≤ top + avail
      //   → fit ≤ (avail + shift) / (need + shift)
      const shift = parseFloat(getComputedStyle(canvas).getPropertyValue("--canvas-shift")) || 0;
      const heightFit = (avail + shift) / (need + shift);
      const fit = Math.max(MIN_FIT, Math.min(widthFit, heightFit));
      shell.style.setProperty("--fit", String(fit));
      // 바닥까지 줄이고도 안 들어가면 스크롤을 연다 (min-height 아래로는 축소 대신 스크롤)
      shell.classList.toggle("shell--scroll", (need + shift) * fit - shift > avail + 1);
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
