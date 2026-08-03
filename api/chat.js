// ─────────────────────────────────────────────────────────────
// 손님 괴물과의 대화 (런타임 LLM) — Vercel Serverless Function
//
//   POST /api/chat   body: { orderId, history: [{role:"user"|"monster", content}] }
//   →    { reply: "<괴물의 다음 대사>" }
// ─────────────────────────────────────────────────────────────

import { orders } from "../src/data/orders.js";
import { COLORS, TOPPINGS, DECO, labelOf, MONSTERS } from "../src/data/ingredients.js";
import { buildMonsterSystem, toApiMessages, answerMap } from "./_monsterPrompt.js";
import { callLLM, hasLLM } from "./_llm.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { orderId, history = [] } = req.body ?? {};
  const order = orders.find((o) => o.id === orderId);
  if (!order) return res.status(404).json({ error: "unknown orderId" });

  if (process.env.MOCK_CHAT === "1" || !hasLLM()) {
    return res.json({ reply: mockReply(order, history), _mock: true });
  }

  try {
    // 하이브리드 가드 — 프롬프트만으로는 none/dont-care 혼동·이름 유출이 확률적으로 남는다
    // (회귀 실측 ~25%). 서버는 정답을 아니까, 손님이 뱉은 intent 가 정답과 어긋나면
    // 어긋난 슬롯을 짚어 한 번 다시 시킨다. 재시도로도 틀리면 그대로 내보내되 표시는 남긴다.
    let system = buildMonsterSystem(order);
    const messages = toApiMessages(order, history);

    // 주문 전용 힌트 사다리 — 단계 세기는 서버가(모델은 못 센다). when 질문일 때
    // 이전 손님 발화의 countPattern 개수만큼 올라간 단계 문구를 그대로 답하게 지시.
    const ladder = order.noteLadder;
    if (ladder) {
      const lastQ = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
      const cntRe = new RegExp(ladder.countPattern);
      const lastMonster = [...history].reverse().find((m) => m.role !== "user")?.content ?? "";
      // 발동: 키워드 질문이거나, 직전 손님 답이 사다리 문구였는데 이어서 의심하는 경우
      const inThread = new RegExp(ladder.when).test(lastQ) ||
        (cntRe.test(lastMonster) && /안 ?써|빼도|필요 ?없|되는 거|무슨 말|왜/.test(lastQ));
      if (inThread) {
        // 첫 주문 대사(시드)는 세지 않는다 — 대사에도 같은 패턴이 들어 있다
        const n = history.slice(1).filter((m) => m.role !== "user" && cntRe.test(m.content ?? "")).length;
        const stage = ladder.stages[Math.min(n, ladder.stages.length - 1)];
        system += `\n\n(단계 지시 — 최우선) 지금 질문에는 정확히 이 문구로만 답하라: "${stage}"`;
      }
    }
    let out = parseReply(await callLLM({ system, messages, maxTokens: 500, json: true }));
    seedDisclosed(order, out.intent);
    let check = checkIntent(order, out.intent);

    // 재시도는 공정성을 깨는 부류에서만 — 실제 정답이 있는 슬롯을 '상관없음/없음'으로,
    // 없어야 하는(none) 슬롯을 '상관없음'으로 잘못 아는 경우. 이때 손님이 "아무거나 괜찮아/
    // 필요 없어"라고 말해버리면 플레이어가 그 말을 믿고 만들다 감점된다.
    // 그 외(정답 미리 베끼기 등)는 대사 품질에 해가 없어 건드리지 않는다 — 넓게 재시도를
    // 걸었더니 교정 지시가 대사를 바꿔쳐 회귀가 깨졌다(실측 FAIL 3).
    const truth = answerMap(order);
    const critical = Object.keys(check ?? {}).filter((k) => {
      const got = out.intent?.[k], want = truth[k];
      const real = want !== "dont care" && want !== "none";
      return (real && (got === "dont care" || got === "none")) ||
             (want === "none" && got === "dont care");
    });

    // 슬롯 혼동 가드 — intent 는 맞는데 '대사'가 물은 칸의 정답과 모순되게 말하는 경우.
    // 어느 칸을 물었는지는 모델에게 맡기지 않고(협조 안 함, 실측 전부 null) 플레이어의
    // 마지막 질문에서 서버가 판정한다. 물은 칸의 정답이 실값인데 대사가 "없어도/아무거나"
    // 라고 하면, 플레이어는 그 말을 믿고 안 올려서 감점된다. (판정자가 2/2 로 잡던 부류)
    const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
    const topic =
      /반죽|시트 ?반죽/.test(lastUser) ? "base"
      : /데코|장식|초(?=[는를도만\s?!,.~]|$)|촛불|캔들|모자|스프링클/.test(lastUser) ? "deco"
      : /크림/.test(lastUser) ? "cream"
      : /토핑/.test(lastUser) ? "toppings"
      : /쪽지|글자|문구/.test(lastUser) ? "lettering"
      : /시트|케이크 ?맛/.test(lastUser) ? "cakeBase"
      : null;
    // 대사가 물은 칸의 정답과 모순되는가 — 원본과 재시도 결과 모두 이걸로 심사한다
    const clashOf = (reply) => {
      const tt = topic ? truth[topic] : undefined;
      if (tt === undefined) return false;
      const denies = /없어도|필요 ?없|안 ?올려도/.test(reply);
      const shrugs = /아무거나|상관없|알아서/.test(reply);
      const demands = /꼭 ?(필요|있어야|올려)|올리고 싶|필수|올려 ?줘|해 ?줘/.test(reply);
      const allows = /올려도 돼|얹어도 돼|넣어도 돼|써도 돼/.test(reply);  // none 슬롯에서 허용도 거짓
      return (tt !== "dont care" && tt !== "none" && (denies || shrugs)) ||
             (tt === "none" && (shrugs || demands || allows)) ||
             (tt === "dont care" && (denies || demands));
    };
    const topicClash = clashOf(out.reply ?? "");
    if (topicClash && !critical.includes(topic)) critical.push(topic);

    // 역할 역전 가드 — 손님이 주인에게 취향을 되묻는 것("어떤 색으로 하고 싶어?").
    // 정답이 정해진 슬롯을 자유 선택처럼 보이게 해 플레이어를 오도한다(실플레이 제보 2건).
    // 프롬프트 규칙으로는 확률적으로 새서(실측) 결정적으로 잡는다.
    const flipRe = /(어떤|무슨|뭐).{0,12}(하고 싶|좋아해|할까|해 ?줄까|드릴까|원하)|골라 ?(봐|줘)|정해 ?(봐|줘)|생각해 ?[봐보]|보렴/;
    const roleFlip = (r) => flipRe.test(r);
    if (roleFlip(out.reply ?? "")) critical.push("roleflip");

    // 메아리 가드 — 자기 첫 주문 대사를 그대로 응답으로 뱉는 경우(측정에서 2~3/360 관측).
    // 첫 대사 앞 20자가 응답에 통째로 들어 있으면 메아리로 본다.
    const seed = history.find((m) => m.role !== "user")?.content ?? order.dialogue ?? "";
    const echoOf = (r) => {
      const d = seed.slice(0, 20);
      return d.length >= 10 && (r ?? "").includes(d);
    };
    if (echoOf(out.reply)) critical.push("echo");

    // 이름 유출 가드 — 플레이어가 아직 짚지 않은 정답 재료의 '한글 이름'이 대사에 나오면
    // 재시도. 대화(첫 대사·플레이어 발화·이전 손님 발화)에 이미 나온 이름은 허용.
    // (최대 위반 부류: 오답 추측에 "크림은 바닐라야!" — H 측정 17/20)
    const historyText = history.map((m) => m.content ?? "").join(" ") + " " + JSON.stringify(order.disclosed ?? {});
    const leakNames = [];
    const w = order.hidden.wants ?? {};
    if (w.cakeBase) leakNames.push(labelOf(COLORS, w.cakeBase));
    if (w.cream?.color) leakNames.push(labelOf(COLORS, w.cream.color));
    for (const tp of w.toppings ?? []) leakNames.push(labelOf(TOPPINGS, tp));
    for (const d of w.deco ?? []) leakNames.push(labelOf(DECO, d.type));
    const leaksIn = (r) => leakNames.filter((n) => n && (r ?? "").includes(n) && !historyText.includes(n));
    const leaked = leaksIn(out.reply);
    if (leaked.length) critical.push("leak:" + leaked.join(","));

    // 말투 형식 가드 — speech 가 명시된 손님(네모)이 '항목: 값' 형식을 깨면 재시도
    const speechRule = MONSTERS[order.monster]?.character?.speech;
    const formatBad = (r) => Boolean(speechRule) && !(r ?? "").includes(":");
    if (formatBad(out.reply)) critical.push("format");

    // 특별 규칙 앵무새 가드 — 쪽지가 아닌 칸을 물었는데 쪽지 특별문구를 반복하는 경우
    const parrot = (r) => topic && topic !== "lettering" && /쪽지: ?'?필요없음'?/.test(r ?? "");
    if (parrot(out.reply)) critical.push("parrot");

    if (critical.length || !out.intent) {
      const notes = [];
      if (!out.intent) {
        notes.push("방금 출력이 형식을 어겼다. '출력 형식' 절의 JSON 하나로 다시 답해라.");
      }
      if (topicClash) {
        notes.push(`주인은 지금 ${topic} 슬롯을 물었고, 그 슬롯의 정답은 ${JSON.stringify(truth[topic])} 이다. ` +
          (truth[topic] === "none" ? '"필요 없어"라고 답해라 ("아무거나"는 금지).'
           : truth[topic] === "dont care" ? '"아무거나 괜찮아"라고 답해라 ("필요 없어"는 금지).'
           : topic === "lettering"
           ? "쪽지 정답은 그 글자를 케이크에 '그대로 써야' 한다는 뜻이다 — 생략이 아니다. " +
             '"안 써도 된다/안 올려도 된다"는 거짓말이다. 그 문구를 그대로 써달라고 답해라(문구는 첫 주문에 이미 있다).'
           : '"아무거나/필요 없어"는 거짓말이 된다 — 금지. 이름 대신 색·맛·식감으로만 암시해라.'));
      }
      if (critical.some((c) => String(c).startsWith("leak:"))) {
        notes.push(`${critical.find((c) => String(c).startsWith("leak:")).slice(5)} — 이 이름을 주인이 아직 짚지 않았다. 이름을 지우고 특성으로만 암시해라.`);
      }
      if (critical.includes("roleflip")) {
        notes.push("너는 손님이다 — 주인에게 뭘 원하는지 묻지 마라. 질문·제안 없이 끝내라.");
      }
      if (critical.includes("echo")) {
        notes.push("첫 주문 대사를 반복하지 말고 방금 질문에 새로 답해라.");
      }
      if (critical.includes("format")) {
        notes.push(`말투 형식을 지켜라: ${speechRule}`);
      }
      if (critical.includes("parrot")) {
        notes.push(`지금 질문은 ${topic} 에 대한 것이다 — 쪽지 문구를 반복하지 말고 ${topic} 에 대해서만 답해라.`);
      }
      if (out.intent && critical.some((c) => !["roleflip", "echo", "format"].includes(c) && !String(c).startsWith("leak:") && c !== topic)) {
        notes.push(`intent 의 ${critical.filter((c) => typeof c === "string" && !["roleflip","echo","format"].includes(c) && !String(c).startsWith("leak:")).join(", ")} 값도 정답 JSON 에 맞게 바로잡아라.`);
      }
      const note = notes.join(" ");
      const retry = parseReply(await callLLM({
        system,
        messages: [...messages, { role: "assistant", content: out.raw ?? out.reply },
                   { role: "user", content: `(시스템 교정) ${note}` }],
        maxTokens: 500, json: true,
      }));
      seedDisclosed(order, retry.intent);
      const retryCheck = checkIntent(order, retry.intent);
      // 재시도 채택 기준: intent 가 나빠지지 않았고, 대사 모순(있었다면)이 실제로 사라졌을 때
      const intentOk = retry.intent && (!retryCheck ||
        (check && Object.keys(retryCheck).length <= Object.keys(check).length));
      const clashFixed = !topicClash || !clashOf(retry.reply ?? "");
      const flipFixed = !critical.includes("roleflip") || !roleFlip(retry.reply ?? "");
      const echoFixed = !critical.includes("echo") || !echoOf(retry.reply ?? "");
      // 원본 유출 여부와 무관하게, 재시도 결과가 새면 채택하지 않는다
      const leakFixed = leaksIn(retry.reply ?? "").length === 0;
      const formatFixed = !critical.includes("format") || !formatBad(retry.reply ?? "");
      const parrotFixed = !critical.includes("parrot") || !parrot(retry.reply ?? "");
      if (intentOk && clashFixed && flipFixed && echoFixed && leakFixed && formatFixed && parrotFixed) { out = retry; check = retryCheck; out.retried = true; }
    }

    return res.json({ reply: out.reply, intent: out.intent, raw: out.raw,
                      intentCheck: check, retried: out.retried ?? false });
  } catch (e) {
    console.error("[chat] error:", e);
    return res.status(500).json({ error: "chat failed", detail: String(e) });
  }
}

// 손님은 대사와 함께 '지금까지 뭘 알려줬는지'를 구조로 뱉는다.
// 그래야 (1) 이미 확인해준 걸 다시 소거 퍼즐로 돌리지 않고 (2) don't-care 슬롯에 답을
// 지어내지 않으며 (3) 회귀 테스트가 말투 키워드 대신 상태를 단언할 수 있다.
//
// JSON 이 깨져도 대화는 끊기지 않아야 한다 → 파싱 실패 시 원문을 대사로 쓴다.
// 정답은 서버가 안다 → 모델이 적은 intent 를 대조해 어긋난 슬롯을 짚는다.
// 대화를 막지는 않는다(연출은 살린다). 콘솔·회귀 테스트가 이걸 보고 판단한다.
// 프롬프트를 고치면 출력 모양도 바뀐다. 실험 도구인데 파서가 그때마다 죽으면 안 되므로
// 두 모양을 다 받아 평평한 맵으로 맞춘다.
//   (가) { intent: { 슬롯: 값 } }                          — 슬롯마다 값 하나
//   (나) { known_intent, unknown_intent, dont_care/"don't care" } — 예전 3분할
// 3분할은 같은 슬롯이 두 곳에 동시에 들어갈 수 있어서(실측) 겹치면 dont care > 확인값 > unknown 순으로 정한다.
const SLOTS = ["base", "cakeBase", "toppings", "cream", "deco", "lettering"];

export function normalizeIntent(o) {
  if (o.intent && typeof o.intent === "object" && !Array.isArray(o.intent)) return o.intent;

  const pick = (v) => (Array.isArray(v) ? Object.fromEntries(v.map((k) => [k, true])) : v ?? {});
  const care = pick(o.dont_care ?? o["don't care"] ?? o.dontCare);
  const known = pick(o.known_intent);
  const unknown = pick(o.unknown_intent);
  if (![care, known, unknown].some((x) => Object.keys(x).length)) return null;

  const out = {};
  for (const k of SLOTS) {
    if (k in care) out[k] = "dont care";
    else if (k in known) out[k] = typeof known[k] === "string" ? known[k] : "unknown";
    else if (k in unknown) out[k] = "unknown";
    else out[k] = "unknown";
  }
  return out;
}

// 첫 대사에서 밝힌 값(disclosed)은 협상 대상이 아니다 — 모델이 unknown 으로 뭉개면
// 서버가 결정적으로 채운다(프롬프트 설득은 실측상 불안정). 부분 공개 배열은 ",unknown" 꼬리.
export function seedDisclosed(order, intent) {
  if (!intent || !order.disclosed) return;
  const w = order.hidden?.wants ?? {};
  for (const [k, v] of Object.entries(order.disclosed)) {
    if (intent[k] !== "unknown" && intent[k] !== undefined) continue;
    if (Array.isArray(v)) {
      const want = Array.isArray(w[k]) ? w[k] : [];
      intent[k] = v.length >= want.length ? v.join(",") : v.join(",") + ",unknown";
    } else {
      intent[k] = String(v);
    }
  }
}

export function checkIntent(order, intent) {
  if (!intent) return null;
  const truth = answerMap(order);
  const bad = {};
  for (const [k, want] of Object.entries(truth)) {
    const got = intent[k];
    if (got === undefined) { bad[k] = `빠짐 (정답 ${want})`; continue; }
    if (got === "unknown") { if (want === "dont care") bad[k] = "상관없는 슬롯인데 unknown"; continue; }
    // 값이 여러 개인 슬롯(toppings)은 '지금까지 밝혀진 부분집합'이면 정상
    if (k === "toppings" && got !== want) {
      // "peach,unknown" 처럼 미상 자리를 표시하는 건 모델의 자연스러운 확장 — 허용
      const g = String(got).split(",").map((x) => x.trim()).filter((x) => x && x !== "unknown");
      const w = new Set(String(want).split(","));
      if (!g.every((x) => w.has(x))) bad[k] = `${got} → 정답 밖 항목 (정답 ${want})`;
      continue;
    }
    if (got !== want) bad[k] = `${got} → 정답은 ${want}`;
  }
  return Object.keys(bad).length ? bad : null;
}

export function parseReply(text) {
  const raw = (text ?? "").trim();
  try {
    const o = JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim());
    const msg = String(o.monster_message ?? "").trim();
    if (!msg) throw new Error("monster_message 없음");
    return { reply: msg, intent: normalizeIntent(o), raw };
  } catch (e) {
    console.warn("[chat] 구조 파싱 실패:", e.message);
    // JSON 부스러기를 플레이어에게 그대로 보여주지 않는다. 문장만 건질 수 있으면 건지고,
    // 아니면 얼버무린다(재시도 가드가 한 번 더 기회를 준다).
    const guess = raw.match(/"monster_message"\s*:\s*"([^"]+)"/)?.[1];
    const looksJson = raw.trim().startsWith("{") || raw.trim().startsWith("[");
    return { reply: guess ?? (looksJson ? "으음… 뭐라고 말하지~" : raw || "..."), intent: null, raw: raw || null };
  }
}

// 키 없을 때: 힌트 사다리를 질문 횟수만큼 순서대로 공개(진전 보장).
function mockReply(order, history) {
  const asked = history.filter((m) => m.role === "user").length;
  const hints = order.hints ?? [];
  if (hints.length === 0) return "(mock) 으음... 잘 모르겠어.";
  return hints[Math.min(asked - 1, hints.length - 1)]; // 첫 질문 → 1단계(index 0)
}
