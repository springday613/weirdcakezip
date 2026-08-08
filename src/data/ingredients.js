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

// ② 케이크 베이스: 시트·쪽지·생크림의 맛/색을 결정 (색이 아니라 '재료'로 고른다 — 맛이 곧 색)
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

// ⑤ 재료 잠금 (S18) — 표시 전용. 실제 언락(코인 차감·저장)은 후속 티켓.
//    값 = 열리는 시점: 1 = 레벨 1부터(튜토리얼에서만 잠김) · 2 = 스테이지 2부터(이번 판 내내 잠김).
//    키는 팔레트 단계 id 와 같다. 없는 재료는 항상 열려 있다. 데코·쪽지는 잠그지 않는다.
export const LOCKS = {
  sheet: { water: 1, soymilk: 1, riceflour: 1, veggieoil: 1, icecream: 2, gelatin: 2 },
  color: { strawberry: 1, cherry: 1, lemon: 1, chocolate: 1, tomato: 1, blueberry: 1, avocado: 1, peach: 1, banana: 2, protein: 2 },
  // cream 에 strawberry·cherry 가 없는 건 의도 — 튜토리얼 정답(체리 생크림)이 잠기면 안 된다.
  // 베이스는 바닐라만 열고 생크림은 3색(바닐라·딸기·체리)을 여는 비대칭이 스펙(2026-08-03 결정).
  cream: { lemon: 1, chocolate: 1, tomato: 1, blueberry: 1, avocado: 1, peach: 1, banana: 2, protein: 2 },
  topping: { banana: 2, almond: 2, chicken: 2 },
};
// 현재 레벨 — 튜토리얼(0번째 주문) = 0, 레벨 1~4 = 1. 스테이지 2는 아직 없다.
const levelOf = (orderIndex) => (orderIndex === 0 ? 0 : 1);
// 잠겨 있으면 열리는 시점(1|2)을, 열려 있으면 null 을 돌려준다.
export const lockOf = (kind, id, orderIndex) => {
  const unlock = LOCKS[kind]?.[id];
  return unlock != null && unlock > levelOf(orderIndex) ? unlock : null;
};

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
      ` (색: ${cake.cakeBase ? labelOf(COLORS, cake.cakeBase) : "없음"})`,
    `생크림: ${cake.cream ? `${labelOf(COLORS, cake.cream.color)} ×${creamN}` : "안 올림"}`,
    `토핑: ${groupCount(cake.toppings, TOPPINGS)}`,
    `데코: ${groupCount(cake.deco, DECO)}`,
    `쪽지: ${cake.lettering?.text ? `"${cake.lettering.text}" (${cake.lettering.color ? labelOf(COLORS, cake.lettering.color) : "-"})` : "없음"}`,
  ];
}

// 괴물 손님 — 직접 만든 그림(표정 3종: normal/happy/sad)
//
// character 는 '종'의 것이다. 성격(personality)이 화법을 정하고, 좋아함·배경은 양념.
// S15 의 9종 로스터 + S8 의 character 구조를 합쳤다 — trait 초안이 personality 로 승격.
// 어금니는 흑백 라인만 있어 아직 없다 → 위키 캐릭터 도감 참조.
const face = (id) => ({
  normal: `/assets/${id}.webp`, happy: `/assets/${id}_happy.webp`, sad: `/assets/${id}_sad.webp`,
});
// 표정이 normal 하나뿐인 종 — 세 표정이 같은 그림이라 점수가 표정에 안 드러난다.
// 그림이 나오면 face() 로 바꾼다.
const oneFace = (id) => ({ normal: `/assets/${id}.webp`, happy: `/assets/${id}.webp`, sad: `/assets/${id}.webp` });

export const MONSTERS = {
  pink: {
    name: "핑크", img: face("pink"),
    character: {   // 사용자 원안(2026-08-01) — ghost 퇴장으로 '다른 몬스터들'로 일반화
      personality: "활발하고 신난 개구쟁이. 감탄사('우와!', '히히!')가 많고 말이 빠르다. 신나서 앞서 말한다.",
      favorite: "딸기, 핑크색 물건들, 폭신한 것",
      dislike: "뚱뚱하다고 듣는 것",
      background: "갓 태어난 개구쟁이 몬스터. 다른 몬스터들을 잘 따른다. 꿈은 세상에서 가장 큰 딸기를 먹어보는 것.",
    },
  },
  cherry: {
    name: "체리", img: face("cherry"),
    character: {
      personality: "공손하고 또박또박. 정중한 나머지 원하는 걸 에둘러 말한다.",
      favorite: "머리 위 체리 광내기, 격식 있는 티타임, 하얀 생크림",
      dislike: "말이 끊기는 것, 흐트러진 접시",
      background: "몸이 케이크인 손님. 가게의 단골 신사 — 예의를 차리다 정작 원하는 건 빙 둘러 말한다.",
    },
  },
  robot: {
    name: "네모", img: face("robot"), // 표정 3종 완비 (QA23 / KAN-77)
    character: {
      personality: "감정 표현이 없는 기계. 주문서를 읽듯 항목과 값으로 말하고 수치를 즐겨 쓴다. 해석하거나 부연하지 않는다.",
      speech: "반드시 '항목: 값' 나열로만 말한다. 예: \"베이스: 초콜릿, 생크림: 초콜릿, 데코: 필요없음.\" 평서문·감탄사·이모지 금지. 잡담에도 형식 유지(예: \"인사: 확인.\").",
      favorite: "정확한 계량, 대칭, 줄 맞춘 토핑",
      dislike: "애매한 표현, 오차",
      background: "베이커리 리뷰를 수집하러 온 계측 로봇. 감정 모듈은 미탑재지만 케이크 앞에서만 기록이 빨라진다.",
    },
  },
  dust: {
    name: "먼지", img: face("dust"),
    character: {
      personality: "수줍고 몽환적. 추억에 잠겨 말끝을 흐리고, '음…', '헤헤…' 같은 여린 감탄사를 쓴다.",
      favorite: "조용한 오후, 옛날 이야기, 하얀 것",
      dislike: "재촉당하는 것, 시끄러운 곳",
      background: "가게에 제일 오래 다닌 단골. 먹은 케이크는 다 기억하는데 언제 먹었는지는 잘 못 떠올린다.",
    },
  },
  spike: {
    name: "별사탕", img: face("spike"),
    character: {
      personality: "감정이 크고 시끄럽다. 좋으면 폭발하고 싫으면 대성통곡한다.",
      favorite: "반짝이는 것, 큰 리액션, 폭죽 같은 스프링클",
      dislike: "미지근한 반응, 기다리는 것",
      background: "별사탕에서 태어났다는 소문이 있다. 기쁘면 온몸의 뿔이 반짝인다.",
    },
  },
  flame: {
    name: "활활이", img: face("flame"),
    character: {
      personality: "고집 세고 직설적. 살짝 툴툴대며 말한다. 자기 말이 문자 그대로 진심이라고 우긴다.",
      favorite: "제 말이 그대로 이뤄지는 것, 뜨끈한 오븐 앞자리",
      dislike: "오해받는 것, 말을 대충 흘려듣는 것",
      background: "화가 나면 더 활활 타오르지만 케이크 앞에서는 꾹 참는다.",
    },
  },
  bean: {
    name: "젤리콩", img: face("bean"),
    character: {
      personality: "말랑하게 늘어진다. 기분 따라 녹아서 기복이 크다.",
      favorite: "낮잠, 미끄러운 바닥, 흔들리는 푸딩",
      dislike: "각진 것, 결정을 재촉당하는 것",
      background: "기분 따라 몸 색이 옅어졌다 진해진다. 완전히 녹으면 데굴데굴 굴러다닌다.",
    },
  },
  cat: {
    name: "나비", img: face("cat"),
    character: {
      personality: "도도한 미식가. 칭찬에 인색하고 '알아서 해줘'라고 던진다.",
      favorite: "완벽한 플레이팅, 창가 자리, 제 취향을 알아맞히는 주인",
      dislike: "과한 친절, 뻔한 맛",
      background: "동네 미식가. 칭찬은 아끼지만 만족하면 꼬리가 살짝 흔들린다.",
    },
  },
  marsh: {
    name: "모찌", img: face("marsh"),
    character: {
      personality: "순하지만 우유부단하다. 말을 계속 바꾼다.",
      favorite: "푹신한 것 전부, 남이 대신 골라주는 것",
      dislike: "최종 결정, 딱딱한 식감",
      background: "말을 계속 바꾸는 건 전부 맛있어 보여서다. 날개는 장식이 아니라 진짜로 조금 난다.",
    },
  },
};

// 점수 → 몬스터 표정. 경계는 별점과 같다(★4 이상 happy · 통과선 미만 sad).
// 근원은 scoreCake.js 의 구간 상수 — 여기서 숫자를 따로 들고 있으면 어긋난다.
export const moodOf = (score) => (starsFor(score) >= 4 ? "happy" : score < PASS ? "sad" : "normal");
