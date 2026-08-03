// 튜토리얼(첫 주문) BUILD 가이드 (S21) — 물범 안내 + 치트 시트.
// ⚠ hidden.wants 를 읽지 않는다(정답 누출 금지 규약). 여기 값은 튜토리얼 대본과 짝인 별도 데이터.
export const TUTORIAL_GUIDE = {
  orderId: "order-000",
  intro: [
    "이번엔 내가 치트 시트로 도와줄게!",
    "하지만 다음 번부터는 혼자 기억해서 해야해~",
  ],
  cheat: [
    "케이크 베이스: 바닐라",
    "생크림: 체리",
    "토핑: 복숭아+체리",
    "데코, 쪽지: 마음대로~",
  ],
  // 단계별 정답 — 시트는 기본 조합 버튼, 색/생크림/토핑은 재료 id
  picks: { color: "vanilla", cream: "cherry", topping: ["peach", "cherry"] },
};
