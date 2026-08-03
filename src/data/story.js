// 스토리 컷 (S19) — 원본은 리포 밖 ../assets/assets-story/, webp 변환해 반영.
// story_end_2 는 굿·배드 공용 컷 — 원본 end_good_2 와 end_bad_2 가 같은 파일이다(바이트 동일 확인).
export const STORY = {
  // 첫 컷은 배경 그림만 — 무대가 열리고 이야기가 시작되는 느낌 (총 7컷)
  begin: ["/assets/bg_default.webp", ...[1, 2, 3, 4, 5, 6].map((n) => `/assets/story_begin_${n}.webp`)],
  endGood: [
    "/assets/story_end_good_1.webp",
    "/assets/story_end_2.webp",
    "/assets/story_end_good_3.webp",
    "/assets/story_end_good_4.webp",
    "/assets/story_end_good_5.webp",
  ],
  // 배드 엔딩은 원안부터 1·2·4 세 컷 구성 (3번 컷 없음)
  endBad: [
    "/assets/story_end_bad_1.webp",
    "/assets/story_end_2.webp",
    "/assets/story_end_bad_4.webp",
  ],
};

// 굿/배드 분기 — 최종 코인 기준. 5주문 전부 통과선(60점=60코인)이면 300. ⚠ 실측 후 조정
export const GOOD_ENDING_COINS = 300;
