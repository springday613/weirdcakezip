// 재료 vocabulary — 회의록(260717) "그려야할거" 기준.
// 지금은 이모지/색으로 렌더(에셋 0). 나중에 PNG로 교체해도 이 구조 그대로.

// ① 시트 베이스: 섞어서 시트를 만든다. 기본 조합 = 밀가루+우유+계란+버터.
//    아이스크림→아이스크림케이크, 젤라틴→젤리케이크 등 변형 가능.
export const SHEET_BASE = [
  { id: "flour", label: "밀가루", emoji: "🌾" },
  { id: "milk", label: "우유", emoji: "🥛" },
  { id: "egg", label: "계란", emoji: "🥚" },
  { id: "butter", label: "버터", emoji: "🧈" },
  { id: "water", label: "물", emoji: "💧" },
  { id: "soymilk", label: "두유", emoji: "🫗" },
  { id: "riceflour", label: "쌀가루", emoji: "🍚" },
  { id: "veggieoil", label: "식물성오일", emoji: "🌻" },
  { id: "icecream", label: "아이스크림", emoji: "🍨" },
  { id: "gelatin", label: "젤라틴", emoji: "🍮" },
];
// 기본 시트 조합
export const BASIC_BASE = ["flour", "milk", "egg", "butter"];

// 시트 조합 판정 → "cake" | "jelly" | "icecream" | null(이상한 조합)
// 정식 조합:
//  · 일반 케이크: {밀가루|쌀가루} + {우유|두유} + {버터|올리브오일}, 계란은 선택(있어도/없어도)
//  · 젤리: 젤라틴 + 물 (딱 둘)
//  · 아이스크림: 아이스크림 (딱 하나)
export function sheetType(base) {
  const s = new Set(base ?? []);
  if (s.size === 2 && s.has("gelatin") && s.has("water")) return "jelly";
  if (s.size === 1 && s.has("icecream")) return "icecream";
  const flour = ["flour", "riceflour"].filter((x) => s.has(x));
  const milk = ["milk", "soymilk"].filter((x) => s.has(x));
  const fat = ["butter", "veggieoil"].filter((x) => s.has(x));
  const known = new Set(["flour", "riceflour", "milk", "soymilk", "butter", "veggieoil", "egg"]);
  const others = [...s].filter((x) => !known.has(x));
  if (flour.length === 1 && milk.length === 1 && fat.length === 1 && others.length === 0) return "cake";
  return null;
}

// ② 색내기: 시트·레터링·생크림의 맛/색을 결정 (색이 아니라 '재료'로 선택)
export const COLORS = [
  { id: "vanilla", label: "바닐라", emoji: "🍦", hex: "#fff2cc" },
  { id: "strawberry", label: "딸기", emoji: "🍓", hex: "#ffd1dc" },
  { id: "cherry", label: "체리", emoji: "🍒", hex: "#e63950" },
  { id: "lemon", label: "레몬", emoji: "🍋", hex: "#fff27a" },
  { id: "chocolate", label: "초콜릿", emoji: "🍫", hex: "#8b5a2b" },
  { id: "tomato", label: "토마토", emoji: "🍅", hex: "#ff6b57" },
  { id: "blueberry", label: "블루베리", emoji: "🫐", hex: "#6a7bd8" },
  { id: "avocado", label: "아보카도", emoji: "🥑", hex: "#a3c585" },
  { id: "peach", label: "복숭아", emoji: "🍑", hex: "#ffcab0" },
  { id: "banana", label: "바나나", emoji: "🍌", hex: "#ffe08a" },
  { id: "protein", label: "프로틴파우더", emoji: "🥤", hex: "#d9c7a8" },
];

// ③ 토핑
export const TOPPINGS = [
  { id: "strawberry", label: "딸기", emoji: "🍓" },
  { id: "cherry", label: "체리", emoji: "🍒" },
  { id: "lemon", label: "레몬", emoji: "🍋" },
  { id: "chocolate", label: "초콜릿", emoji: "🍫" },
  { id: "tomato", label: "토마토", emoji: "🍅" },
  { id: "blueberry", label: "블루베리", emoji: "🫐" },
  { id: "avocado", label: "아보카도", emoji: "🥑" },
  { id: "peach", label: "복숭아", emoji: "🍑" },
  { id: "banana", label: "바나나", emoji: "🍌" },
  { id: "protein", label: "프로틴파우더", emoji: "🥤" },
  { id: "almond", label: "아몬드", emoji: "🌰" },
  { id: "chicken", label: "닭가슴살", emoji: "🍗" },
];

// ④ 데코 (개수 있음 — 배치한 수가 곧 개수)
export const DECO = [
  { id: "birthday_candle", label: "생일초", emoji: "🕯️" },
  { id: "heart_candle", label: "하트초", emoji: "💗" },
  { id: "bomb_candle", label: "폭탄초", emoji: "🧨" },
  { id: "sprinkle", label: "레인보우스프링클", emoji: "🌈" },
];

// 색 id → hex 조회
export const hexOf = (id) => COLORS.find((c) => c.id === id)?.hex ?? "#f5efe6";
export const emojiOf = (list, id) => list.find((x) => x.id === id)?.emoji ?? "•";
export const labelOf = (list, id) => list.find((x) => x.id === id)?.label ?? id;

// 같은 종류끼리 묶어 "라벨 ×개수"로
function groupCount(items, list) {
  const m = {};
  for (const it of items ?? []) m[it.type] = (m[it.type] ?? 0) + 1;
  return Object.entries(m).map(([t, n]) => `${labelOf(list, t)} ×${n}`).join(", ") || "없음";
}

// 케이크 상태 → 사람이 읽는 요약 (결과 화면 "내가 만든 것"용)
export function describeCake(cake) {
  const creamN = cake.cream?.dollops?.length ?? 0;
  return [
    `시트: ${(cake.base ?? []).map((b) => labelOf(SHEET_BASE, b)).join("+") || "없음"}` +
      ` (색: ${cake.sheetColor ? labelOf(COLORS, cake.sheetColor) : "없음"})`,
    `생크림: ${cake.cream ? `${labelOf(COLORS, cake.cream.color)} ×${creamN}` : "안 올림"}`,
    `토핑: ${groupCount(cake.toppings, TOPPINGS)}`,
    `데코: ${groupCount(cake.deco, DECO)}`,
    `레터링: ${cake.lettering?.text ? `"${cake.lettering.text}" (${cake.lettering.color ? labelOf(COLORS, cake.lettering.color) : "-"})` : "없음"}`,
  ];
}

// 괴물 손님 — 직접 만든 그림(표정 3종: normal/happy/sad)
//
// trait 는 성격 '초안'이다. 손님이 애매하게 말하는 방식을 종마다 다르게 하려고 둔다.
// 프롬프트에 쓰이는 건 orders.js 의 persona 이고, 둘을 맞추는 건 S8(KAN-11).
// 어금니는 흑백 라인만 있어 아직 없다 → 위키 캐릭터 도감 참조.
const face = (id) => ({
  normal: `/assets/${id}.webp`, happy: `/assets/${id}_happy.webp`, sad: `/assets/${id}_sad.webp`,
});
// 표정이 normal 하나뿐인 종 — 세 표정이 같은 그림이라 점수가 표정에 안 드러난다.
// 그림이 나오면 face() 로 바꾼다.
const oneFace = (id) => ({ normal: `/assets/${id}.webp`, happy: `/assets/${id}.webp`, sad: `/assets/${id}.webp` });

export const MONSTERS = {
  pink:   { name: "핑크",   trait: "활발한 개구쟁이. 감탄사가 많고 말이 빠르다. 신나서 앞서 말한다.", img: face("pink") },
  cherry: { name: "체리",   trait: "공손하고 또박또박. 정중한 나머지 원하는 걸 에둘러 말한다.", img: face("cherry") },
  robot:  { name: "네모",   trait: "감정 없이 수치로 말한다. 정확한데 정작 뭘 원하는지는 모르겠다.", img: oneFace("robot") },
  dust:   { name: "먼지",   trait: "조용하고 몽롱하다. 추억에 잠겨 말끝을 흐린다.", img: face("dust") },
  spike:  { name: "별사탕", trait: "감정이 크고 시끄럽다. 좋으면 폭발하고 싫으면 대성통곡한다.", img: face("spike") },
  flame:  { name: "활활이", trait: "급하고 욱한다. 자기 말이 문자 그대로 진심이라고 우긴다.", img: face("flame") },
  bean:   { name: "젤리콩", trait: "말랑하게 늘어진다. 기분 따라 녹아서 기복이 크다.", img: face("bean") },
  cat:    { name: "나비",   trait: "도도한 미식가. 칭찬에 인색하고 '알아서 해줘'라고 던진다.", img: face("cat") },
  marsh:  { name: "모찌",   trait: "순하지만 우유부단하다. 말을 계속 바꾼다.", img: face("marsh") },
};

// 점수 → 몬스터 표정
export const moodOf = (score) => (score >= 80 ? "happy" : score < 50 ? "sad" : "normal");
