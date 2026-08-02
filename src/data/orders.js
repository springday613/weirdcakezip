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
    monster: "pink",
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
    monster: "robot",
    persona: "감정 표현이 없는 기계 괴물. 주문서를 읽듯 항목과 값으로 말하고 수치를 즐겨 쓴다. 해석하거나 부연하지 않는다.",
    dialogue: "시트: 초콜릿, 생크림: 초콜릿, 토핑: 초콜릿, 데코: 필요없음, 레터링: 필요없음.",
    hidden: {
      intent: "같은 '필요없음'이 두 항목에서 다르게 쓰였다. 데코는 진짜로 없는 것이고, 레터링은 그 글자를 그대로 써달라는 뜻(생략 아님). 케이크는 초콜릿 시트+초콜릿 생크림+초콜릿 토핑.",
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
      "주문서의 값을 그대로 전달했습니다. 해석은 하지 않았습니다.",
      "데코 항목과 레터링 항목의 값은 같은 문자열입니다. 처리 방식은 다릅니다.",
      "레터링 항목의 값은 출력할 문자열입니다. 삭제 지시가 아닙니다.",
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
