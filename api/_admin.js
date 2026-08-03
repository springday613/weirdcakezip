// ─────────────────────────────────────────────────────────────
// 프롬프트 편집 콘솔 (로컬 전용) — devServer 가 :3001/admin 으로 띄운다.
//
// 왜: 프롬프트를 고칠 때마다 배포해서 확인하면 느리고, 검증 안 된 프롬프트가
// 프로덕션에 올라간다. 여기서 고치고 바로 옆에서 대화로 시험한다.
//
// 편집한 내용은 prompt-overrides.json(gitignore)에 저장되고 이 서버가 메모리에
// 적용한다. orders.js·TEMPLATE 원본은 건드리지 않는다 — 확정된 문구만 손으로 옮긴다.
// ─────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { orders } from "../src/data/orders.js";
import { SHEET_BASE, COLORS, TOPPINGS, DECO, MONSTERS } from "../src/data/ingredients.js";
import { TEMPLATE, setTemplate, getTemplate, promptParts, buildMonsterSystem, answerMap, toApiMessages } from "./_monsterPrompt.js";
import { callLLM } from "./_llm.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = join(HERE, "..", "prompt-overrides.json");
const LOG = join(HERE, "..", "docs", "prompt-engineering-log.md");

// 주문별로 편집할 수 있는 필드. wants 는 프롬프트와 채점 양쪽에 쓰인다.
// 성격(화법)은 몬스터의 것이라 여기 없다 → MONSTERS[].character
// intent(원하는 것 서술)는 콘솔에서 안 고친다 — 출력의 intent(슬롯 상태)와 헷갈린다.
const FIELDS = ["dialogue", "wish", "hints", "wants", "disclosed"];

const clone = (x) => JSON.parse(JSON.stringify(x));
const ids = (list) => new Set(list.map((x) => x.id));
const VOCAB = { base: ids(SHEET_BASE), color: ids(COLORS), topping: ids(TOPPINGS), deco: ids(DECO) };

// 정답을 손으로 고치면 오타 하나가 조용히 채점을 깨뜨린다. 저장 전에 어휘를 확인한다.
// ⚠ 키가 아예 없으면 don't-care(상관없음), 키가 있고 빈 값이면 none(없어야 함) — 다른 뜻이다.
function validateWants(w) {
  const bad = [];
  const known = (v, kind) => VOCAB[kind].has(v) || bad.push(`${kind}: 모르는 id "${v}"`);
  if ("base" in w) {
    if (!Array.isArray(w.base)) bad.push("base 는 배열이어야 한다");
    else w.base.forEach((v) => known(v, "base"));
  }
  if ("cakeBase" in w && w.cakeBase != null) known(w.cakeBase, "color");
  if ("toppings" in w) {
    if (!Array.isArray(w.toppings)) bad.push("toppings 는 배열이어야 한다");
    else w.toppings.forEach((v) => known(v, "topping"));
  }
  if ("cream" in w && w.cream != null) {
    if (typeof w.cream !== "object") bad.push("cream 은 { color } 이거나 null");
    else known(w.cream.color, "color");
  }
  if ("deco" in w) {
    if (!Array.isArray(w.deco)) bad.push("deco 는 배열이어야 한다");
    else w.deco.forEach((d) => {
      known(d?.type, "deco");
      if (!(Number.isInteger(d?.count) && d.count > 0)) bad.push(`deco "${d?.type}": count 는 1 이상 정수`);
    });
  }
  if ("lettering" in w && typeof w.lettering?.text !== "string") bad.push("lettering 은 { text } 형태");
  return bad;
}

const base = new Map(
  orders.map((o) => [o.id, { dialogue: o.dialogue, wish: o.hidden.intent, disclosed: clone(o.disclosed ?? {}),
                             intent: o.hidden.intent, hints: [...(o.hints ?? [])],
                             wants: clone(o.hidden.wants ?? {}) }])
);

const CHAR = ["personality", "favorite", "dislike", "background"];
const baseChar = new Map(
  Object.entries(MONSTERS).map(([id, m]) => [id, clone(m.character ?? {})])
);

function read() {
  if (!existsSync(FILE)) return { template: null, orders: {} };
  try {
    return JSON.parse(readFileSync(FILE, "utf-8"));
  } catch (e) {
    console.error("[admin] prompt-overrides.json 을 읽지 못했다:", e.message);
    return { template: null, orders: {} };
  }
}

// 저장본을 메모리에 반영한다. orders 배열의 객체를 그대로 고치므로
// chat.js 가 같은 인스턴스를 보고 즉시 새 값으로 답한다(서버 재시작 불필요).
export function apply(ov = read()) {
  setTemplate(ov.template);
  for (const o of orders) {
    const b = base.get(o.id);
    const e = ov.orders?.[o.id] ?? {};
    o.dialogue = e.dialogue ?? b.dialogue;
    o.hidden.intent = e.wish ?? b.wish;
    o.hidden.intent = e.intent ?? b.intent;
    o.hints = e.hints ?? [...b.hints];
    o.hidden.wants = e.wants ? clone(e.wants) : clone(b.wants);
    o.disclosed = e.disclosed ? clone(e.disclosed) : clone(b.disclosed);
  }
  for (const [id, m] of Object.entries(MONSTERS)) {
    m.character = { ...baseChar.get(id), ...(ov.monsters?.[id] ?? {}) };
  }
  return ov;
}

function state() {
  const ov = read();
  return {
    vocab: { base: SHEET_BASE, colors: COLORS, toppings: TOPPINGS, deco: DECO },
    template: getTemplate(),
    templateDefault: TEMPLATE,
    templateEdited: Boolean(ov.template),
    monsters: Object.entries(MONSTERS).map(([id, m]) => ({
      id,
      character: { ...Object.fromEntries(CHAR.map((k) => [k, ""])), ...m.character },
      usedBy: orders.filter((o) => o.monster === id).map((o) => o.id),
      edited: Boolean(ov.monsters?.[id]),
    })),
    orders: orders.map((o, i) => ({
      id: o.id,
      seq: i + 1,
      monster: o.monster,
      dialogue: o.dialogue,
      wish: o.hidden.intent,
      hints: o.hints ?? [],
      wants: o.hidden.wants,
      disclosed: o.disclosed ?? {},
      scripted: Boolean(o.script),
      answer: answerMap(o),   // 프롬프트에 들어가는 구조화된 정답 그대로
      parts: promptParts(o),
      prompt: buildMonsterSystem(o),
      edited: Boolean(ov.orders?.[o.id]),
      base: base.get(o.id),
    })),
  };
}

// ── 실험 로그 자동 기록 ───────────────────────────────────────
// docs/prompt-engineering-log.md 는 제출용 「AI 활용 기술 문서」의 뼈대라 서술형이다.
// 그 흐름을 망치지 않도록 파일 끝 서명 앞에 '자동 기록' 절을 만들어 거기에만 쌓는다.
const AUTO = "## 콘솔 편집 이력 (자동 기록)";

// 프롬프트에 실제로 들어가는 것만 찍는다 — 이게 바뀌어야 대화가 바뀐다
function snapshot() {
  return {
    template: getTemplate(),
    monsters: Object.fromEntries(Object.entries(MONSTERS).map(([id, m]) => [id, { ...m.character }])),
    orders: Object.fromEntries(orders.map((o) => [o.id, buildMonsterSystem(o)])),
  };
}

function diffLines(before, after) {
  const out = [];
  if (before.template !== after.template) {
    const b = before.template.split("\n"), a = after.template.split("\n");
    const n = Math.max(b.length, a.length);
    let changed = 0;
    for (let i = 0; i < n; i++) if (b[i] !== a[i]) changed++;
    out.push(`- 규칙 템플릿 ${b.length}줄 → ${a.length}줄 (다른 줄 ${changed})`);
  }
  for (const id of Object.keys(after.monsters)) {
    for (const k of CHAR) {
      const b = before.monsters[id]?.[k] ?? "", a = after.monsters[id][k] ?? "";
      if (b !== a) out.push(`- \`${id}.${k}\`: ${b ? `“${b}”` : "(빔)"} → ${a ? `“${a}”` : "(빔)"}`);
    }
  }
  for (const id of Object.keys(after.orders)) {
    if (before.orders[id] !== after.orders[id]) {
      const b = (before.orders[id] ?? "").length, a = after.orders[id].length;
      out.push(`- \`${id}\` 완성 프롬프트 ${b}자 → ${a}자`);
    }
  }
  return out;
}

function appendLog(what, before, after) {
  const lines = diffLines(before, after);
  if (!lines.length) return;                    // 실질 변화가 없으면 안 남긴다
  // toISOString 은 UTC 라 한국 시각과 9시간 어긋난다 → 로컬 시각으로
  const now = new Date().toLocaleString("sv-SE").slice(0, 16);
  const entry = `\n### ${now} · ${what}\n${lines.join("\n")}\n`;
  try {
    let doc = readFileSync(LOG, "utf-8");
    if (!doc.includes(AUTO)) {
      const sig = doc.lastIndexOf("\n---\n\n*작성:");
      const block = `\n---\n\n${AUTO}\n\n> 프롬프트 콘솔(\`/admin\`)에서 저장할 때마다 자동으로 쌓인다.\n` +
                    `> 확정한 문구를 코드에 옮긴 뒤에는 위 서술 절에 '무엇을 왜'로 정리한다.\n`;
      doc = sig > 0 ? doc.slice(0, sig) + block + doc.slice(sig) : doc + block;
    }
    const at = doc.indexOf(AUTO);
    const next = doc.indexOf("\n---\n", at);
    const cut = next > 0 ? next : doc.length;
    writeFileSync(LOG, doc.slice(0, cut) + entry + doc.slice(cut), "utf-8");
  } catch (e) {
    console.error("[admin] 실험 로그 기록 실패:", e.message);
  }
}

export default async function handler(req, res) {
  const path = req.url.split("?")[0];

  if (path === "/api/admin/state") return res.json(state());

  // 회귀 하네스(testChat.py --judge)의 LLM 판정용. 키는 이 서버만 들고 있으므로
  // 파이썬이 직접 외부 API 를 부르지 않고 여기로 온다. 손님(OPENAI_MODEL)과
  // 판정자(JUDGE_MODEL)를 분리한다 — 자기 채점 편향을 피한다.
  // 이번 턴에 모델로 갈 것 그대로 — chat.js 와 같은 함수(buildMonsterSystem·toApiMessages)로
  // 재구성하므로 실제 전송분과 일치한다(재시도 교정 메시지는 제외 — 그건 raw 로 본다).
  if (path === "/api/admin/payload") {
    const { orderId, history = [] } = req.body ?? {};
    const order = orders.find((o) => o.id === orderId);
    if (!order) return res.status(404).json({ error: "unknown orderId" });
    return res.json({ system: buildMonsterSystem(order), messages: toApiMessages(order, history) });
  }

  if (path === "/api/admin/judge") {
    const { system, messages } = req.body ?? {};
    if (!system || !messages) return res.status(400).json({ error: "system·messages 필요" });
    try {
      const text = await callLLM({
        system, messages, maxTokens: 500, json: true,
        model: process.env.JUDGE_MODEL || "gpt-4o",
      });
      return res.json({ text });
    } catch (e) {
      return res.status(500).json({ error: String(e) });
    }
  }

  if (path === "/api/admin/save") {
    const { template, orderId, monsterId, fields } = req.body ?? {};
    const ov = read();
    ov.orders ??= {};
    ov.monsters ??= {};
    const before = snapshot();

    if (monsterId) {
      const b = baseChar.get(monsterId);
      if (!b) return res.status(404).json({ error: "unknown monsterId" });
      const kept = {};
      for (const k of CHAR) {
        if (!(k in (fields ?? {}))) continue;
        if ((fields[k] ?? "") !== (b[k] ?? "")) kept[k] = fields[k];
      }
      if (Object.keys(kept).length) ov.monsters[monsterId] = kept;
      else delete ov.monsters[monsterId];
    }
    if (template !== undefined) ov.template = template?.trim() === TEMPLATE.trim() ? null : template;
    if (orderId) {
      const b = base.get(orderId);
      if (!b) return res.status(404).json({ error: "unknown orderId" });
      if (fields?.wants) {
        const bad = validateWants(fields.wants);
        if (bad.length) return res.status(400).json({ error: "정답이 어휘와 안 맞는다", detail: bad });
      }
      const kept = {};
      for (const k of FIELDS) {
        if (!(k in (fields ?? {}))) continue;
        const same = JSON.stringify(fields[k]) === JSON.stringify(b[k]);
        if (!same) kept[k] = fields[k];
      }
      if (Object.keys(kept).length) ov.orders[orderId] = kept;
      else delete ov.orders[orderId];
    }
    writeFileSync(FILE, JSON.stringify(ov, null, 2), "utf-8");
    apply(ov);
    appendLog(template !== undefined ? "규칙 템플릿" : monsterId ? `몬스터 ${monsterId}` : `주문 ${orderId}`,
              before, snapshot());
    return res.json(state());
  }

  if (path === "/api/admin/reset") {
    const { orderId, monsterId } = req.body ?? {};
    const ov = read();
    const before = snapshot();
    if (monsterId) delete ov.monsters?.[monsterId];
    else if (orderId) delete ov.orders?.[orderId];
    else if (existsSync(FILE)) unlinkSync(FILE);
    if (orderId || monsterId) writeFileSync(FILE, JSON.stringify(ov, null, 2), "utf-8");
    apply(orderId || monsterId ? ov : { template: null, orders: {}, monsters: {} });
    appendLog(`되돌리기 — ${monsterId ?? orderId ?? "전체"}`, before, snapshot());
    return res.json(state());
  }

  return res.status(404).json({ error: "unknown admin route" });
}
