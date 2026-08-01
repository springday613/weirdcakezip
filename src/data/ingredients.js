// 재료 vocabulary — 회의록(260717) "그려야할거" 기준.
// 지금은 이모지/색으로 렌더(에셋 0). 나중에 PNG로 교체해도 이 구조 그대로.

import { PASS, starsFor } from "../scoreCake.js";

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

// ② 케이크 맛: 시트·레터링·생크림의 맛을 결정 (색이 아니라 '재료'로 고른다 — 맛이 곧 색)
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
  { id: "almond", label: "아몬드", emoji: "🌰" },
  { id: "chicken", label: "닭가슴살", emoji: "🍗" },
];

// ④ 데코 (개수 있음 — 배치한 수가 곧 개수)
export const DECO = [
  { id: "birthday_candle", label: "생일초", emoji: "🕯️" },
  { id: "heart_candle_red", label: "빨간 하트초", emoji: "❤️" },
  { id: "heart_candle_pink", label: "핑크 하트초", emoji: "💗" },
  { id: "heart_candle_blue", label: "파란 하트초", emoji: "💙" },
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
// character 는 '종'의 것이고, orders.js 의 persona 는 '이 주문에서의 화법'이다.
// 한 스프라이트가 여러 주문을 맡을 수 있어서 둘을 섞지 않는다 — 프롬프트에서도
// 배경(character)과 성격(persona)을 다른 절로 넣는다.
export const MONSTERS = {
  ghost: {
    img: { normal: "/assets/ghost.webp", happy: "/assets/ghost_happy.webp", sad: "/assets/ghost_sad.webp" },
    character: {
      // ⚠ 스프라이트가 2종뿐이라 한 몬스터가 주문 둘을 맡는다. 성격은 몬스터의 것이므로
      // order-003(개구쟁이)을 이 종의 성격으로 삼았다 — order-001 도 이 말투로 말한다.
      // 9종으로 갈라지는 S15 가 머지되면 주문마다 제 성격을 갖는다.
      personality: "활발하고 신난 개구쟁이. 딸기를 세상에서 제일 좋아해서 들떠 있다. 감탄사('우와!', '히히!')가 많고 말이 빠르다.",
      favorite: "하얀 것, 폭신한 것",
      dislike: "재촉당하는 것",
      background: "가게에 제일 오래 다닌 단골. 먹은 케이크는 다 기억하는데 언제 먹었는지는 잘 못 떠올린다.",
    },
  },
  pink: {
    img: { normal: "/assets/pink.webp", happy: "/assets/pink_happy.webp", sad: "/assets/pink_sad.webp" },
    character: {
      // order-002(고집불통)의 화법을 이 종의 성격으로 — '필요없음' 함정이 이 말투에 걸려 있다.
      personality: "고집 세고 직설적. 살짝 툴툴대며 말한다. 오해받는 걸 싫어하고, 자기 말이 문자 그대로 진심이라고 우긴다.",
      favorite: "분홍색 물건, 자기 말을 끝까지 들어주는 것",
      dislike: "오해받는 것, 말을 대충 흘려듣는 것",
      background: "가게 근처에 사는 단골. 주인장이 자기 말을 제대로 알아듣는지 늘 시험한다.",
    },
  },
};

// 점수 → 몬스터 표정. 경계는 별점과 같다(★4 이상 happy · 통과선 미만 sad).
// 근원은 scoreCake.js 의 구간 상수 — 여기서 숫자를 따로 들고 있으면 어긋난다.
export const moodOf = (score) => (starsFor(score) >= 4 ? "happy" : score < PASS ? "sad" : "normal");
