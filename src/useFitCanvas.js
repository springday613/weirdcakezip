import { useLayoutEffect, useRef } from "react";

// BUILD 캔버스를 화면 세로에 맞춘다 (QA2 / KAN-52).
// 이 캔버스는 748px 기준으로 픽셀 단위로 맞춰 둔 구도라 재배치가 아니라 '통째로 축소'로 맞춘다.
// 세로가 넉넉하면 배율 1 — 기존 화면과 완전히 같다. 짧은 기기에서만 줄어든다.
const BOTTOM_GAP = 8; // 맨 아래 편집줄과 화면 끝 사이 최소 여백
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
      const fit = Math.max(MIN_FIT, Math.min(1, avail / need));
      shell.style.setProperty("--fit", String(fit));
      // 바닥까지 줄이고도 안 들어가면 스크롤을 연다 (min-height 아래로는 축소 대신 스크롤)
      shell.classList.toggle("shell--scroll", need * fit > avail);
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
