// 결정적 채점 — 구조화된 케이크 vs exact 정답(wants) 비교.
// ★ wants에 '적힌 항목만' 채점한다. 안 적은 항목은 don't-care(상관없음) → 감점 없음.
//   (손님이 대화로 언급한 것만 정답에 넣으면, 알 수 없는 걸로 감점되지 않아 공정)
//
// 기본 가중치(적힌 항목끼리 100점으로 정규화): 시트맛 30 / 토핑 30 / 레터링 20 / 생크림 10 / 데코 10

const WEIGHT = { base: 15, sheetColor: 25, toppings: 25, lettering: 20, cream: 10, deco: 10 };
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
function creamFrac(want, made) {
  if (want == null) return made ? 0 : 1; // 크림 없어야 함
  return made && made.color === want.color ? 1 : 0;
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
  if ("sheetColor" in w) raw.push({ key: "시트 맛", wk: "sheetColor", frac: cake.sheetColor === w.sheetColor ? 1 : 0 });
  if ("toppings" in w) raw.push({ key: "토핑", wk: "toppings", frac: toppingFrac(w.toppings, cake.toppings) });
  if ("lettering" in w) raw.push({ key: "레터링", wk: "lettering", frac: norm(cake.lettering?.text) === norm(w.lettering?.text) ? 1 : 0 });
  if ("cream" in w) raw.push({ key: "생크림", wk: "cream", frac: creamFrac(w.cream, cake.cream) });
  if ("deco" in w) raw.push({ key: "데코", wk: "deco", frac: decoFrac(w.deco, cake.deco) });

  const totalW = raw.reduce((s, p) => s + WEIGHT[p.wk], 0) || 1;
  const parts = raw.map((p) => ({ key: p.key, weight: Math.round((WEIGHT[p.wk] / totalW) * 100), frac: p.frac }));
  const score = Math.round((raw.reduce((s, p) => s + WEIGHT[p.wk] * p.frac, 0) / totalW) * 100);
  const missing = parts.filter((p) => p.frac < 0.999).map((p) => p.key);
  return { score, parts, missing, passed: score >= 80 };
}

// 점수 → 괴물 반응 (점수와 항상 일치)
export function reactionFor(score, missing) {
  if (score >= 95) return "완벽해! 딱 내가 원하던 거야! 🎉";
  if (score >= 80) return "좋아, 마음에 쏙 들어!";
  if (score >= 60) return `음… 나쁘진 않은데, ${missing[0] ?? "뭔가"}가 좀 아쉬워.`;
  return `이건 내가 원한 게 아니야… 특히 ${missing[0] ?? "많은 게"}가 아쉬워.`;
}
