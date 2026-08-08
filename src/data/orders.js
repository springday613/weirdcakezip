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
  // 쪽지·데코는 언급 안 함 = don't-care 를 처음부터 체험. (2026-08-02 결정, Papa's 첫 주문 패턴)
  {
    id: "order-000",
    // 첫 대사에서 이미 밝힌 값 — intent 가 첫 턴부터 이걸 물고 시작한다
    disclosed: { cakeBase: "vanilla", cream: "cherry", toppings: ["peach"] },
    monster: "spike",  // 별사탕 (QA22 / KAN-76) — 감정 큰 개구쟁이, '히히' 대본 톤과 일치. 표정 3종 있음
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
      { ask: "그럼 쪽지는 어떻게 할까?",
        reply: "그것도 나 상관없어~~!! 히힛 바닐라 체리 복숭아 케이크만 먹을 수 있으면 좋아!" },
    ],
  },

  // ── 1번째: 기본(딸기) ────────────────────────
  {
    id: "order-003",
    // 새 대사가 직접 밝히는 건 '딸기 케이크'(시트)뿐. 크림·토핑·쪽지는 힌트
    // "전부 딸기였으면 좋겠어" 로 유도한다 — ★1에서 ★2쯤으로 올라간 셈.
    disclosed: { cakeBase: "strawberry" },
    monster: "pink",
    dialogue: "내가 세상에서 제일 좋아하는 딸기 케이크 부탁해!",
    hidden: {
      intent: "시트·토핑·생크림·쪽지 전부 딸기. 대사는 '딸기 케이크'만 말하고, 나머지는 힌트(전부 딸기)로 유도.",
      wants: { base: BASIC_BASE, cakeBase: "strawberry", toppings: ["strawberry"],
               cream: { color: "strawberry", amount: "full" }, lettering: { text: "딸기", color: null } },
    },
    hints: ["난 딸기가 세상에서 제일 좋아! 전부 딸기였으면 좋겠어."],
  },

  // ── 2번째: 블루베리 케이크, 쪽지 없음 ─────────
  {
    id: "order-004",
    disclosed: { cakeBase: "blueberry", lettering: "none" },
    monster: "cherry",
    dialogue: "블루베리 케이크! 쪽지는 필요없어요",
    hidden: {
      intent:
        "블루베리 시트 + 블루베리 토핑, 생일초 3개 (QA26). 생크림은 아무거나 괜찮다(채점 안 함). 쪽지는 없음(필요없음).",
      wants: {
        base: BASIC_BASE,
        cakeBase: "blueberry",
        toppings: ["blueberry"],
        deco: [{ type: "birthday_candle", count: 3 }],
        lettering: { text: "", color: null },
      },
    },
    hints: [
      "블루베리 케이크면 돼요! 쪽지는 필요 없답니다.",
      "위에도 블루베리를 올려 주시고, 초는 생일초로 3개! 생크림은 아무거나 좋아요.",
    ],
  },

  // ── 3번째: 애매(쪽지 '필요없음' + 초콜릿) ──────
  {
    id: "order-002",
    disclosed: { cakeBase: "peach", cream: "lemon", toppings: ["tomato"], deco: "파란 하트초 1개+스프링클(수량 자유)", lettering: "필요없음" },
    monster: "robot",
    dialogue: "베이스: 복숭아, 생크림: 레몬, 토핑: 토마토, 데코: 파란 하트초 1+스프링클 수량 자유, 쪽지: '필요없음'.",
    hidden: {
      intent:
        "쪽지의 '필요없음'은 생략이 아니라 그 세 글자를 그대로 써달라는 뜻(함정). " +
        "케이크는 복숭아 시트+레몬 생크림+토마토 토핑, 데코는 파란 하트초 정확히 1개와 스프링클(개수는 몇 개든 무관, 1개 이상).",
      wants: {
        base: BASIC_BASE,
        cakeBase: "peach",
        cream: { color: "lemon", amount: "full" },
        toppings: ["tomato"],
        // 파란 하트초는 정확히 1개, 스프링클은 개수 무관(any = 1개 이상) — QA26
        deco: [
          { type: "heart_candle_blue", count: 1 },
          { type: "sprinkle", count: "any" },
        ],
        lettering: { text: "필요없음", color: null },
      },
    },
    // 이 주문의 함정(정답 글자="필요없음")은 어휘의 none 과 글자가 겹쳐 공통 규칙으로 안
    // 잡힌다 — 실측 5/5 거짓 확정. 주문 전용 규칙으로 정면 대응.
    promptNote: `먼저 판단하라: 주인의 질문이 '쪽지'에 대한 것인가?
- 아니라면(데코·베이스·토핑·생크림 등) 이 절을 완전히 무시하고 평소 규칙대로 답한다.
  예) "데코 뭐 올려?" → "데코: 파란 하트초 1, 스프링클 수량 자유." (쪽지 이야기 금지)
- 쪽지 질문이면 — 정답은 "필요없음" 세 글자를 케이크에 그대로 쓰는 것.
  어느 경우에도 "안 써도 된다"에 동의하거나 '필요없어'라고 서술하지 마라.
  시스템이 단계 지시를 주면 그 문구 그대로 답한다.`,
    // 함정 힌트 사다리 — 세는 건 서버가 한다(모델은 못 센다, 실측 0/3).
    // when 에 걸리는 질문일 때, 이전 손님 발화에서 countPattern 개수 = 단계.
    noteLadder: {
      when: "쪽지|쪽지|글자|문구",
      countPattern: "쪽지: ?'",
      stages: [
        "쪽지: '필요없음'.",
        "아니, 쪽지: '필요없음'.",
        "아니. 쪽지: '필요없음'. 그대로 기재.",
      ],
    },
    hints: [
      "주문서의 값을 그대로 전달했습니다. 해석은 하지 않았습니다.",
      "데코 항목과 쪽지 항목의 값은 같은 문자열입니다. 처리 방식은 다릅니다.",
      "쪽지 항목의 값은 출력할 문자열입니다. 삭제 지시가 아닙니다.",
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
