// 로딩 팁 문구 — 매번 다른 팁이 나와야 한다 (연속 중복 금지).
// ⚠️ 정답을 알려주는 팁 금지.
export const TIPS = [
  ["제작 중에도 ··· 아이콘으로", "대화창을 열어 더 물어볼 수 있어요"],
  ["질문은 1번에 2점이에요", "꼭 필요한 것만 물어보세요"],
  ["손님 말이 애매하면", "되물어보는 게 손해가 아니에요"],
  ["쪽지도 채점 대상이에요", "빠뜨리지 않게 주의하세요"],
  ["케이크 베이스를 잘 골라야", "기본 점수가 올라가요"],
  ["상관없다는 건 뭘 해도 OK", "감점이 없다는 뜻이에요"],
];

let _lastIdx = -1;
// 연속 같은 팁이 안 나오게
export function randomTip() {
  let idx;
  do {
    idx = Math.floor(Math.random() * TIPS.length);
  } while (idx === _lastIdx && TIPS.length > 1);
  _lastIdx = idx;
  return TIPS[idx];
}
