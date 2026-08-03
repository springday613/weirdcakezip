// ─────────────────────────────────────────────────────────────
// 주문 데이터 (척추 ①) — 클라이언트·서버 공용
//  · hidden.wants : '적은 항목만' 채점. 안 적은 항목은 상관없음(don't-care).
//  · 성격(화법)은 주문이 아니라 몬스터의 것 → ingredients.js 의 MONSTERS[].character
//  진행 순서: 0(튜토리얼) → 3 → 4 → 2 → 1 (기본 주문 먼저, 애매한 주문 나중)
// ─────────────────────────────────────────────────────────────

import { BASIC_BASE } from "./ingredients.js";

export const orders = [
  // ── 0번째: 튜토리얼 ─────────────────────────
  // 명시적·이질적 주문(문장 조각 → 칸 매핑을 한 번씩 강제) + 일부러 낸 구멍 하나(질문 1회 유도).
  // 레터링·데코는 언급 안 함 = don't-care 를 처음부터 체험. (2026-08-02 결정, Papa's 첫 주문 패턴)
  {
    id: "order-000",
    // 첫 대사에서 이미 밝힌 값 — intent 가 첫 턴부터 이걸 물고 시작한다
    disclosed: { cakeBase: "vanilla", cream: "cherry", toppings: ["peach"] },
    monster: "pink",   // 개구쟁이 — 튜토리얼 대본의 '히히' 톤과 일치
    dialogue: "바닐라 맛 케이크에 체리 생크림 부탁해! 토핑은 복숭아랑... 뭐였더라? 하나가 기억이 안 나~",
    hidden: {
      intent: "바닐라 시트 + 체리 생크림(가득) + 복숭아·체리 토핑. 기억 안 나는 토핑 하나 = 체리 — 헤매면 사다리로 하나씩(튜토리얼이라 후하게).",
      wants: {
        base: BASIC_BASE,
        cakeBase: "vanilla",
        cream: { color: "cherry", amount: "full" },
        toppings: ["peach", "cherry"],
      },
    },
    hints: [
      "빨갛고 동그란… 꼭지가 달린 과일이었는데…",
      "아 맞다, 체리! 체리 토핑도 올려줘!",
    ],
    // 튜토리얼은 LLM 없이 대본으로 진행 — 주인 말은 미리 채워져 있고 '확인'만 누른다.
    // 확률 0: 첫인상이 절대 흔들리지 않는다. 대본 질문은 턴 감점도 물리지 않는다(스테이지1 면제).
    script: [
      { ask: "복숭아랑 뭐였어? 알려줘!",
        reply: "히히! 빨갛고 동그란... 꼭지가 달린 과일이었는데... 뭐지?" },
      { ask: "음.. 딸기?",
        reply: "아, 딸기는 아니야~ 좀 더 새콤하고 작고 동그란 걸 올렸지!" },
      { ask: "알았다, 체리!",
        reply: "맞아, 맞아! 체리 토핑을 올렸어~~!" },
      { ask: "데코는 어떻게 해줄까? 초 꽂아줘?",
        reply: "아니, 데코는 상관없어. 맡길게!" },
      { ask: "그럼 레터링은 어떻게 할까?",
        reply: "그것도 나 상관없어~~!! 히힛 바닐라 체리 복숭아 케이크만 먹을 수 있으면 좋아!" },
    ],
  },

  // ── 1번째: 기본(딸기) ────────────────────────
  {
    id: "order-003",
    // 새 대사가 직접 밝히는 건 '딸기 케이크'(시트)뿐. 크림·토핑·레터링은 힌트
    // "전부 딸기였으면 좋겠어" 로 유도한다 — ★1에서 ★2쯤으로 올라간 셈.
    disclosed: { cakeBase: "strawberry" },
    monster: "pink",
    dialogue: "내가 세상에서 제일 좋아하는 딸기 케이크 부탁해!",
    hidden: {
      intent: "시트·토핑·생크림·레터링 전부 딸기. 대사는 '딸기 케이크'만 말하고, 나머지는 힌트(전부 딸기)로 유도.",
      wants: { base: BASIC_BASE, cakeBase: "strawberry", toppings: ["strawberry"],
               cream: { color: "strawberry", amount: "full" }, lettering: { text: "딸기", color: null } },
    },
    hints: ["난 딸기가 세상에서 제일 좋아! 전부 딸기였으면 좋겠어."],
  },

  // ── 2번째: 블루베리 케이크, 레터링 없음 ─────────
  {
    id: "order-004",
    disclosed: { cakeBase: "blueberry", lettering: "none" },
    monster: "cherry",
    dialogue: "블루베리 케이크! 레터링은 필요없어요",
    hidden: {
      intent: "블루베리 시트 케이크. 레터링은 없음(필요없음).",
      wants: { base: BASIC_BASE, cakeBase: "blueberry", lettering: { text: "", color: null } },
    },
    hints: ["블루베리 케이크면 돼요! 레터링은 필요 없답니다."],
  },

  // ── 3번째: 애매(레터링 '필요없음' + 초콜릿) ──────
  {
    id: "order-002",
    disclosed: { cakeBase: "chocolate", cream: "chocolate", toppings: ["chocolate"], deco: "none", lettering: "필요없음" },
    monster: "robot",
    dialogue: "시트: 초콜릿, 생크림: 초콜릿, 토핑: 초콜릿, 데코: 필요없음, 레터링: 필요없음.",
    hidden: {
      intent: "같은 '필요없음'이 두 항목에서 다르게 쓰였다. 데코는 진짜로 없는 것이고, 레터링은 그 글자를 그대로 써달라는 뜻(생략 아님). 케이크는 초콜릿 시트+초콜릿 생크림+초콜릿 토핑.",
      wants: {
        base: BASIC_BASE,
        cakeBase: "chocolate",
        cream: { color: "chocolate", amount: "full" },
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
    disclosed: {},
    monster: "dust",
    dialogue: "바다가 그리운데.. 바다 생각나는 케이크 없을까요?",
    hidden: {
      intent: "예전에 바다에서 먹었던 딸기케이크(하얀 생크림)를 다시 먹고 싶은 것. '바다'는 추억일 뿐 실제로는 딸기+하얀 크림 케이크.",
      wants: { base: BASIC_BASE, cakeBase: "strawberry", toppings: ["strawberry"], cream: { color: "vanilla", amount: "full" }, deco: [], lettering: { text: "", color: null } },
    },
    hints: [
      "바다 그 자체가 아니야… 그 여름, 바닷가에서 있었던 일이 자꾸 떠올라.",
      "하얀 접시에 담겨 있었어. 빨갛고 반짝이는, 새콤하고 달콤한 작은 알맹이들…",
      "한 입 베어물면 여름 냄새가 났지. 그게 뭐였을까? 네가 알아봐 주면 좋겠어.",
    ],
  },
];
