// 결정적 채점 — 구조화된 케이크 vs exact 정답(wants) 비교.
// ★ wants에 '적힌 항목만' 채점한다. 안 적은 항목은 don't-care(상관없음) → 감점 없음.
//   (손님이 대화로 언급한 것만 정답에 넣으면, 알 수 없는 걸로 감점되지 않아 공정)
//
// 기본 가중치(적힌 항목끼리 100점으로 정규화):
//   시트반죽 15 / 시트맛 25 / 토핑 25 / 쪽지 20 / 생크림 10 / 데코 10

const WEIGHT = { base: 15, cakeBase: 25, toppings: 25, lettering: 20, cream: 10, deco: 10 };

// 점수 구간 — 위키 「게임 플로우」 스펙(2026-07-27 확정)이 근원이다.
//   90+ ★5 happy · 75+ ★4 happy · 60+ ★3 기본(통과선) · 50+ ★2 sad · 그 미만 ★1 sad
// 별점·표정·통과·코인이 전부 이 경계를 쓴다. 한 곳에서만 고치도록 상수로 둔다.
export const PASS = 60;
const TIERS = [90, 75, 60, 50];

// 대화 예산 — 질문은 1턴부터 점수로 지불한다. "애매함을 몇 마디로 좁히는가"가 이 게임의 재미라
// 무료 구간을 두지 않는다(260725 회의). 11턴부터는 코인으로 사는 캐시템이라 깎지 않는다.
export const TURN_BUDGET = 10;
export const TURN_PENALTY = 2;
// 예산 소진 후엔 코인으로 산다(캐시템이라 감점 없음 — finalScore 가 10턴에서 캡).
// 질문 3개 묶음, 살수록 비싸진다: 30→50→100→200. 200코인 묶음까지 사면 마감(최대 +12).
// (2026-08-03 결정. 가격표는 '⚠실측 후 확정' 대상)
export const EXTRA_TURN_BUNDLE = 3;
export const EXTRA_TURN_PRICES = [30, 50, 100, 200];
// 지금까지 산 추가 질문 수 → 다음 묶음 가격 (다 샀으면 null)
export const extraTurnPrice = (extraTurns) =>
  EXTRA_TURN_PRICES[Math.floor(extraTurns / EXTRA_TURN_BUNDLE)] ?? null;
const norm = (t) => (t ?? "").trim();
const sameSet = (a, b) => {
  const x = new Set(a ?? []), y = new Set(b ?? []);
  return x.size === y.size && [...x].every((v) => y.has(v));
};

function toppingFrac(want, made) {
  const m = new Set((made ?? []).map((t) => t.type));
  const types = (made ?? []).map((t) => t.type);
  if ((want ?? []).length === 0) return types.length === 0 ? 1 : 0;
  const hit = want.filter((t) => m.has(t)).length;
  const extra = types.filter((t) => !want.includes(t)).length;
  return Math.min(1, Math.max(0, (hit - extra * 0.5) / want.length));
}
// 생크림 '가득' 기준 — cakeLayout.json cream.slots 수와 같아야 한다 (슬롯 19자리)
export const CREAM_FULL = 19;
function creamFrac(want, made) {
  if (want == null) return made ? 0 : 1; // 크림 없어야 함
  if (!made || made.color !== want.color) return 0;
  // amount 미지정 주문은 예전처럼 색만 본다(과거 호환). "full" 은 채운 만큼 비례.
  if (want.amount === "full") return Math.min(1, (made.dollops?.length ?? 0) / CREAM_FULL);
  return 1;
}
function counts(list) {
  const m = {};
  for (const d of list ?? []) m[d.type] = (m[d.type] ?? 0) + 1;
  return m;
}
function decoFrac(want, made) {
  const wd = counts((want ?? []).flatMap((d) => Array(d.count).fill({ type: d.type })));
  const cd = counts(made);
  const keys = new Set([...Object.keys(wd), ...Object.keys(cd)]);
  for (const k of keys) if ((wd[k] ?? 0) !== (cd[k] ?? 0)) return 0;
  return 1;
}

export function scoreCake(order, cake) {
  const w = order.hidden.wants;
  const raw = [];
  if ("base" in w) raw.push({ key: "시트 반죽", wk: "base", frac: sameSet(w.base, cake.base) ? 1 : 0 });
  if ("cakeBase" in w) raw.push({ key: "케이크 베이스", wk: "cakeBase", frac: cake.cakeBase === w.cakeBase ? 1 : 0 });
  if ("toppings" in w) raw.push({ key: "토핑", wk: "toppings", frac: toppingFrac(w.toppings, cake.toppings) });
  if ("lettering" in w) raw.push({ key: "쪽지", wk: "lettering", frac: norm(cake.lettering?.text) === norm(w.lettering?.text) ? 1 : 0 });
  if ("cream" in w) raw.push({ key: "생크림", wk: "cream", frac: creamFrac(w.cream, cake.cream) });
  if ("deco" in w) raw.push({ key: "데코", wk: "deco", frac: decoFrac(w.deco, cake.deco) });

  const totalW = raw.reduce((s, p) => s + WEIGHT[p.wk], 0) || 1;
  const parts = raw.map((p) => ({ key: p.key, weight: Math.round((WEIGHT[p.wk] / totalW) * 100), frac: p.frac }));
  const score = Math.round((raw.reduce((s, p) => s + WEIGHT[p.wk] * p.frac, 0) / totalW) * 100);
  const missing = parts.filter((p) => p.frac < 0.999).map((p) => p.key);
  // passed 를 여기서 내지 않는다 — 통과는 대화 비용까지 반영한 최종 점수로 판정한다.
  // 두 곳에서 통과를 정하면 "별 2개인데 통과" 같은 모순이 조용히 생긴다. → judge 층에서 한 번만.
  return { score, parts, missing };
}

// 한글 조사: 받침 있으면 withB(이/은/을), 없으면 withoutB(가/는/를)
function hasBatchim(word) {
  const s = word ?? "";
  const c = s.charCodeAt(s.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return false; // 한글 음절이 아니면 받침 없음 취급
  return (c - 0xac00) % 28 !== 0;
}
export function josa(word, withB, withoutB) {
  return (word ?? "") + (hasBatchim(word) ? withB : withoutB);
}

// 슬롯 → 정답 상태. 프롬프트·검증·결과 화면이 같은 계산을 쓰게 한다.
//   "dont care" = wants 에 키 없음 · "none" = 키는 있고 빈 값 · 그 외 = 정답 값
// (ingredients.js 가 이 파일을 import 하므로 여기서 ingredients 를 부르면 순환이 된다 — 부르지 않는다)
export function answerMap(order) {
  const w = order.hidden.wants ?? {};
  const val = {
    base: () => (w.base ?? []).join("+"),
    cakeBase: () => w.cakeBase,
    toppings: () => (w.toppings ?? []).join(","),
    cream: () => w.cream?.color,
    deco: () => (w.deco ?? []).map((d) => `${d.type}x${d.count}`).join(","),
    lettering: () => w.lettering?.text,
  };
  const out = {};
  for (const k of Object.keys(val)) out[k] = !(k in w) ? "dont care" : (val[k]() || "none");
  return out;
}

// 만들기 점수 + 질문 턴 수 → 최종 점수. 만들기 품질과 대화 비용은 다른 축이라
// scoreCake 안에 넣지 않고 여기서 합성한다(채점 테스트가 턴에 흔들리지 않게).
export function finalScore(score, turns = 0) {
  const penalty = Math.min(turns, TURN_BUDGET) * TURN_PENALTY;
  return { score: Math.max(0, score - penalty), penalty };
}

// 최종 점수 → 결과 한 벌. 통과·별점·반응이 전부 같은 점수를 본다.
export function judgeResult(order, cake, turns = 0) {
  const { score: made, parts, missing } = scoreCake(order, cake);
  const { score, penalty } = finalScore(made, turns);
  return { score, made, penalty, turns, parts, missing,
           passed: score >= PASS, stars: starsFor(score), reaction: reactionFor(score, missing) };
}

// 점수 → 별점 1~5. 플레이어에게 점수는 숨기고 이것만 보여준다 —
// 대문짝만한 "68점"은 기준이 뭔지 되묻게 만든다(260725 회의).
export function starsFor(score) {
  const i = TIERS.findIndex((t) => score >= t);
  return i < 0 ? 1 : 5 - i;
}

// 점수 → 괴물 반응 (점수와 항상 일치, 조사 처리). 경계는 별점과 같다.
export function reactionFor(score, missing) {
  if (score >= TIERS[0]) return "완벽해! 딱 내가 원하던 거야!";
  if (score >= TIERS[1]) return "좋아, 마음에 쏙 들어!";
  const m = missing[0] ?? "뭔가";
  if (score >= PASS) return `음… 나쁘진 않은데, ${josa(m, "이", "가")} 좀 아쉬워.`;
  return `이건 내가 원한 게 아니야… 특히 ${josa(missing[0] ?? "많은 것", "이", "가")} 아쉬워.`;
}

// 만족도(점수) → 이번 라운드 수익(코인). 점수가 그대로 코인이다 — 68점이면 68코인.
// 점수는 한 판으로 사라지고 코인은 쌓인다는 게 '돈 버는 재미'의 근거(260725 회의).
// 통과선을 못 넘으면 손님이 안 사감 → 0.
export function coinsFor(score) {
  return score < PASS ? 0 : score;
}
