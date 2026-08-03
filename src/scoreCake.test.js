// scoreCake 채점 유닛 테스트 — `npm test` (node:test, 의존성 없음)
//
// 왜: rules/code-review.md 가 "채점 무결성"을 블로킹 사유 1번으로 두는데 자동 검증이 없었다.
// don't-care(주문에 없던 필드는 채점 제외)와 none(없어야 함 — 있으면 감점)의 구분이 미묘해서
// 사람 눈으로는 회귀를 놓친다. 채점은 '공정성' 담당이라 흔들리면 게임 신뢰가 깨진다.
//
// 스펙: 위키 「게임 플로우」

import test from "node:test";
import assert from "node:assert/strict";

import { scoreCake, coinsFor, reactionFor, josa, starsFor, finalScore, judgeResult,
         TURN_BUDGET, TURN_PENALTY } from "./scoreCake.js";
import { BASIC_BASE, sheetType, moodOf } from "./data/ingredients.js";

// ── fixture ────────────────────────────────────────────────────
// 주문 하나를 손으로 만든다(orders.js 를 그대로 쓰면 정답이 바뀔 때 테스트가 같이 흔들린다).
const order = (wants) => ({ id: "test", hidden: { wants } });

const WANTS = {
  base: BASIC_BASE,
  cakeBase: "strawberry",
  toppings: ["strawberry"],
  cream: { color: "vanilla" },
  deco: [],
  lettering: { text: "" },
};

const PERFECT = {
  base: BASIC_BASE,
  cakeBase: "strawberry",
  toppings: [{ type: "strawberry" }],
  cream: { color: "vanilla" },
  deco: [],
  lettering: { text: "" },
};

const cake = (over = {}) => ({ ...PERFECT, ...over });

// ── 기본 ───────────────────────────────────────────────────────
test("완전 정답이면 100점", () => {
  const r = scoreCake(order(WANTS), cake());
  assert.equal(r.score, 100);
  assert.deepEqual(r.missing, []);
});

test("가중치는 적힌 항목끼리 100 으로 정규화된다", () => {
  // cakeBase(25) + toppings(25) 만 적힌 주문 → 각 50
  const r = scoreCake(order({ cakeBase: "lemon", toppings: ["cherry"] }),
                      cake({ cakeBase: "lemon", toppings: [{ type: "cherry" }] }));
  assert.equal(r.score, 100);
  assert.deepEqual(r.parts.map((p) => p.weight), [50, 50]);
});

// ── don't-care vs none ─────────────────────────────────────────
test("don't-care: wants 에 키가 없으면 무엇을 올려도 점수가 같다", () => {
  const w = { cakeBase: "strawberry" }; // deco·lettering·toppings·cream 키 없음
  const bare = scoreCake(order(w), cake({ deco: [], lettering: { text: "" } }));
  const loaded = scoreCake(order(w), cake({
    deco: [{ type: "bomb_candle" }, { type: "sprinkle" }],
    lettering: { text: "아무거나" },
    toppings: [{ type: "chicken" }],
    cream: { color: "chocolate" },
  }));
  assert.equal(bare.score, 100);
  assert.equal(loaded.score, 100, "don't-care 필드가 감점을 만들면 불공정해진다");
});

test("none: 키가 있고 빈 값이면 채점한다 — 올리면 감점", () => {
  const w = { cakeBase: "strawberry", deco: [] };
  const clean = scoreCake(order(w), cake({ deco: [] }));
  const dirty = scoreCake(order(w), cake({ deco: [{ type: "sprinkle" }] }));
  assert.equal(clean.score, 100);
  assert.ok(dirty.score < clean.score, "none 을 어겼는데 감점이 없다");
  assert.ok(dirty.missing.includes("데코"));
});

test("none: 레터링 빈 문자열인데 글자를 쓰면 감점", () => {
  const w = { cakeBase: "strawberry", lettering: { text: "" } };
  const r = scoreCake(order(w), cake({ lettering: { text: "생일축하" } }));
  assert.ok(r.score < 100);
  assert.ok(r.missing.includes("레터링"));
});

test("none: 크림이 null 이면 크림을 올릴 때 감점", () => {
  const w = { cakeBase: "strawberry", cream: null };
  assert.equal(scoreCake(order(w), cake({ cream: null })).score, 100);
  assert.ok(scoreCake(order(w), cake({ cream: { color: "vanilla" } })).score < 100);
});

// ── 항목별 채점 ────────────────────────────────────────────────
test("레터링은 앞뒤 공백을 무시하고 비교한다", () => {
  const w = { lettering: { text: "딸기" } };
  assert.equal(scoreCake(order(w), cake({ lettering: { text: "  딸기 " } })).score, 100);
  assert.ok(scoreCake(order(w), cake({ lettering: { text: "딸 기" } })).score < 100);
});

test("토핑: 여분을 올리면 감점된다(0.5개 분)", () => {
  const w = { toppings: ["strawberry", "cherry"] };
  const exact = scoreCake(order(w), cake({ toppings: [{ type: "strawberry" }, { type: "cherry" }] }));
  const extra = scoreCake(order(w), cake({
    toppings: [{ type: "strawberry" }, { type: "cherry" }, { type: "chicken" }],
  }));
  assert.equal(exact.score, 100);
  assert.ok(extra.score < exact.score, "여분 토핑에 감점이 없다");
});

test("데코는 개수까지 일치해야 만점", () => {
  const w = { deco: [{ type: "birthday_candle", count: 2 }] };
  const two = scoreCake(order(w), cake({ deco: [{ type: "birthday_candle" }, { type: "birthday_candle" }] }));
  const one = scoreCake(order(w), cake({ deco: [{ type: "birthday_candle" }] }));
  assert.equal(two.score, 100);
  assert.equal(one.score, 0, "데코는 개수가 다르면 0");
});

test("부분 정답 단조성 — 더 맞히면 점수가 낮아지지 않는다", () => {
  const w = { cakeBase: "strawberry", toppings: ["strawberry"], cream: { color: "vanilla" } };
  const none = scoreCake(order(w), cake({ cakeBase: "lemon", toppings: [], cream: { color: "chocolate" } }));
  const one = scoreCake(order(w), cake({ cakeBase: "strawberry", toppings: [], cream: { color: "chocolate" } }));
  const two = scoreCake(order(w), cake({ cakeBase: "strawberry", toppings: [{ type: "strawberry" }], cream: { color: "chocolate" } }));
  const all = scoreCake(order(w), cake());
  assert.ok(none.score <= one.score && one.score <= two.score && two.score <= all.score,
            `단조성 위반: ${none.score} → ${one.score} → ${two.score} → ${all.score}`);
  assert.equal(all.score, 100);
});

// ── 시트 조합 (ingredients.sheetType) ──────────────────────────
test("시트 조합 판정", () => {
  assert.equal(sheetType(BASIC_BASE), "cake");
  assert.equal(sheetType(["riceflour", "soymilk", "veggieoil"]), "cake", "대체 재료도 케이크");
  assert.equal(sheetType(["gelatin", "water"]), "jelly");
  assert.equal(sheetType(["icecream"]), "icecream");
  assert.equal(sheetType(["flour", "water"]), null, "이상한 조합은 null");
  assert.equal(sheetType([]), null);
});

// ── 부수 함수 ──────────────────────────────────────────────────
test("코인은 점수에 연동된다", () => {
  assert.ok(coinsFor(100) > coinsFor(70), "점수가 높으면 더 번다");
  assert.equal(coinsFor(30), 0, "너무 낮으면 손님이 안 사간다");
});

test("반응 문구는 점수와 어긋나지 않는다", () => {
  assert.match(reactionFor(100, []), /완벽/);
  assert.doesNotMatch(reactionFor(20, ["토핑"]), /완벽|좋아/, "낮은 점수에 칭찬이 나오면 안 된다");
});

test("조사 처리", () => {
  assert.equal(josa("토핑", "이", "가"), "토핑이");
  assert.equal(josa("시트", "이", "가"), "시트가");
});

// ── 점수 구간 (위키 「게임 플로우」 스펙) ──────────────────────
// 별점·표정·통과·코인이 같은 경계를 쓴다. 하나만 어긋나도 "왜 우는 얼굴인데 통과야?" 가 된다.
test("통과선은 60점", () => {
  assert.equal(judgeResult(order(WANTS), cake({ cakeBase: "lemon" })).passed, true);
  assert.equal(coinsFor(59), 0, "통과선 미만이면 손님이 안 사간다");
});

test("코인은 점수 그대로", () => {
  assert.equal(coinsFor(68), 68);
  assert.equal(coinsFor(100), 100);
});

test("별점 경계 — 90/75/60/50", () => {
  assert.deepEqual([100, 90, 89, 75, 74, 60, 59, 50, 49, 0].map(starsFor),
                   [5, 5, 4, 4, 3, 3, 2, 2, 1, 1]);
});

test("표정은 별점·통과선과 어긋나지 않는다", () => {
  for (const s of [0, 49, 50, 59, 60, 74, 75, 89, 90, 100]) {
    const mood = moodOf(s), stars = starsFor(s), passed = s >= 60;
    if (mood === "happy") assert.ok(stars >= 4, `${s}점: happy 인데 별 ${stars}개`);
    if (mood === "sad") assert.ok(!passed, `${s}점: sad 인데 통과`);
    if (mood === "normal") assert.ok(passed && stars === 3, `${s}점: 기본 표정인데 별 ${stars}개`);
  }
});

// ── 대화 예산 (질문 턴) ────────────────────────────────────────
// 스펙: 1턴부터 −2점, 기본 예산 10턴. 11턴부터는 코인으로 산 것이라 깎지 않는다.
test("질문은 1턴부터 점수로 지불한다", () => {
  assert.equal(finalScore(100, 0).score, 100, "안 물어보면 감점 없음");
  assert.equal(finalScore(100, 1).score, 100 - TURN_PENALTY, "첫 턴부터 깎인다 — 무료 구간은 없다");
  assert.equal(finalScore(100, 5).score, 90);
});

test("예산을 다 써도 별 4개는 지킨다", () => {
  // −2 를 고른 근거. −3 이면 10턴에 70점(★3)까지 내려가 질문이 훨씬 무거워진다.
  assert.equal(finalScore(100, TURN_BUDGET).score, 80);
  assert.equal(starsFor(finalScore(100, TURN_BUDGET).score), 4);
});

test("예산을 넘긴 턴은 깎지 않는다 (코인으로 산 캐시템)", () => {
  const capped = finalScore(100, TURN_BUDGET).score;
  assert.equal(finalScore(100, TURN_BUDGET + 5).score, capped, "11턴부터는 감점이 늘지 않는다");
});

test("감점이 점수를 음수로 만들지 않는다", () => {
  assert.equal(finalScore(5, TURN_BUDGET).score, 0);
});

test("통과·별점·표정·코인은 전부 최종 점수를 본다", () => {
  // 만들기는 100점이지만 질문을 많이 해서 최종 80점인 경우
  const r = judgeResult(order(WANTS), cake(), TURN_BUDGET);
  assert.equal(r.made, 100, "만들기 점수는 그대로 남는다");
  assert.equal(r.score, 80);
  assert.equal(r.penalty, 20);
  assert.equal(r.stars, starsFor(r.score));
  assert.equal(r.passed, true);
  assert.equal(r.reaction, reactionFor(r.score, r.missing));
});

test("생크림 amount full — 가득 채워야 만점, 색 틀리면 0", () => {
  const w = { cream: { color: "cherry", amount: "full" } };
  const full = Array.from({ length: 19 }, (_, i) => ({ slot: i }));
  assert.equal(scoreCake(order(w), cake({ cream: { color: "cherry", dollops: full } })).score, 100);
  const half = scoreCake(order(w), cake({ cream: { color: "cherry", dollops: full.slice(0, 9) } })).score;
  assert.ok(half < 100 && half > 0, `절반이면 부분 점수: ${half}`);
  assert.equal(scoreCake(order(w), cake({ cream: { color: "vanilla", dollops: full } })).score, 0, "색 틀리면 개수 무관 0");
});
