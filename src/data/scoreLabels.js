// 채점 결과 parts[].key → 화면에 보여줄 한글 레이블.
// ⚠ 필드 id 는 채점 키라 변경 금지 (lettering 등). 레이블만 사람 말로.
// SCORE_LABELS 에 없는 key 는 p.key 를 그대로 표시 — 항목이 늘어도 화면이 안 빈다.
export const SCORE_LABELS = {
  cakeBase:  "케이크 베이스",
  cream:     "생크림",
  toppings:  "토핑",
  deco:      "데코",
  lettering: "쪽지",
  sheet:     "시트",
};
