// ─────────────────────────────────────────────────────────────
// 주문 데이터 (척추 ①) — 클라이언트·서버 공용
//  · hidden.wants : '적은 항목만' 채점. 안 적은 항목은 상관없음(don't-care).
//  진행 순서: 3 → 4 → 2 → 1 (기본 주문 먼저, 애매한 주문 나중)
// ─────────────────────────────────────────────────────────────

import { BASIC_BASE } from "./ingredients.js";

export const orders = [
  // ── 1번째: 기본(딸기) ────────────────────────
  {
    id: "order-003",
    monster: "spike",
    persona: "활발하고 신난 개구쟁이 괴물. 딸기를 세상에서 제일 좋아해서 들떠 있다. 감탄사('우와!', '히히!')가 많고 말이 빠르다.",
    dialogue: "모든 걸 딸기로 해주세요! 레터링도 '딸기'!",
    hidden: {
      intent: "시트·토핑·레터링 전부 딸기.",
      wants: { base: BASIC_BASE, sheetColor: "strawberry", toppings: ["strawberry"], lettering: { text: "딸기", color: null } },
    },
    hints: ["난 딸기가 세상에서 제일 좋아! 전부 딸기였으면 좋겠어."],
  },

  // ── 2번째: 블루베리 케이크, 레터링 없음 ─────────
  {
    id: "order-004",
    monster: "cherry",
    persona: "공손하고 또박또박한 괴물. 주문을 깔끔하고 정중하게 말한다. '~해주세요', '~랍니다' 같은 예의 바른 말투.",
    dialogue: "블루베리 케이크! 레터링은 필요없어요",
    hidden: {
      intent: "블루베리 시트 케이크. 레터링은 없음(필요없음).",
      wants: { base: BASIC_BASE, sheetColor: "blueberry", lettering: { text: "", color: null } },
    },
    hints: ["블루베리 케이크면 돼요! 레터링은 필요 없답니다."],
  },

  // ── 3번째: 애매(레터링 '필요없음' + 초콜릿) ──────
  {
    id: "order-002",
    monster: "flame",
    persona: "고집 세고 직설적인 괴물. 살짝 툴툴대며 말한다. 오해받는 걸 싫어하고, 자기 말이 문자 그대로 진심이라고 우긴다.",
    dialogue: "카카오톡으로 주문했는데 레터링 문구에 '필요없음'이라고 써주세요!",
    hidden: {
      intent: "케이크 위에 '필요없음'이라는 글자를 그대로 써주길 원함(레터링 생략 아님). 케이크는 초콜릿 시트+초콜릿 생크림+초콜릿 토핑.",
      wants: {
        base: BASIC_BASE,
        sheetColor: "chocolate",
        cream: { color: "chocolate" },
        toppings: ["chocolate"],
        deco: [],
        lettering: { text: "필요없음", color: null },
      },
    },
    hints: [
      "그 문구 말이야, 다들 오해하더라. 근데 난 아주 진심이었어.",
      "지우라는 뜻이 절대 아니야. 오히려 그 반대랄까…?",
      "내가 보낸 그 말… 글자 그대로가 내 마음이야. 눈치챘어?",
    ],
  },

  // ── 4번째: 애매(바다 → 딸기케이크) ──────────────
  {
    id: "order-001",
    monster: "dust",
    persona: "수줍고 몽환적인 괴물. 추억에 잠겨 말끝을 자주 흐리고, 감상적이고 나긋하게 말한다. '음…', '헤헤…' 같은 여린 감탄사를 쓴다.",
    dialogue: "바다가 그리운데.. 바다 생각나는 케이크 없을까요?",
    hidden: {
      intent: "예전에 바다에서 먹었던 딸기케이크(하얀 생크림)를 다시 먹고 싶은 것. '바다'는 추억일 뿐 실제로는 딸기+하얀 크림 케이크.",
      wants: { base: BASIC_BASE, sheetColor: "strawberry", toppings: ["strawberry"], cream: { color: "vanilla" }, deco: [], lettering: { text: "", color: null } },
    },
    hints: [
      "바다 그 자체가 아니야… 그 여름, 바닷가에서 있었던 일이 자꾸 떠올라.",
      "하얀 접시에 담겨 있었어. 빨갛고 반짝이는, 새콤하고 달콤한 작은 알맹이들…",
      "한 입 베어물면 여름 냄새가 났지. 그게 뭐였을까? 네가 알아봐 주면 좋겠어.",
    ],
  },
];
