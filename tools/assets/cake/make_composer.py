"""build/compose.html 을 생성한다.

에셋 정보(geometry/toppings/decos)를 손으로 옮겨 적지 않고 JSON 에서 그대로 주입한다.
그림이 바뀌면 build_* 를 다시 돌린 뒤 이 스크립트만 돌리면 합성기가 따라온다.

    python3 make_composer.py
"""

import json

from make_layout import PARAMS
from split_cake_parts import HERE

BUILD = HERE / "build"

LABEL = {"strawberry": "딸기", "blueberry": "블루베리", "banana": "바나나", "lemon": "레몬",
         "peach": "복숭아", "cherry": "체리", "chocolate": "초콜릿", "tomato": "토마토",
         "almond": "아몬드", "chicken": "닭가슴살", "avocado": "아보카도",
         "birthday_candle": "생일초", "heart_candle": "하트초", "bomb_candle": "폭탄초"}
TOP_ORDER = ["strawberry", "blueberry", "banana", "lemon", "peach", "cherry",
             "chocolate", "tomato", "almond", "chicken", "avocado"]
CANDLES = ["birthday_candle", "heart_candle", "bomb_candle"]

# 게임이 실제로 하는 일 — 정적 자리에서 몇 개를 골라 올릴지
SPRINKLE_PER_CLICK = 6
SIM = [("nCream", "생크림", "cNum", 1), ("nTop", "토핑", "sNum", 1),
       ("nCandle", "초", "kNum", 1),
       ("nSpr", "스프링클", "pNum", SPRINKLE_PER_CLICK)]

SLIDERS = [
    ("생크림", [("cSize", "크기", 60, 220), ("cNum", "최대 개수", 8, 34, "개"),
                ("cRx", "링 가로", 70, 110), ("cRy", "링 세로", 70, 110),
                ("cDy", "링 위/아래", -60, 60), ("cSide", "측면 밀도", 40, 200)]),
    ("토핑", [("sSize", "크기", 60, 240), ("sNum", "최대 개수", 0, 14, "개"),
              ("sSpread", "퍼짐", 20, 85), ("sDy", "위/아래", -60, 60),
              ("sJit", "기울기", 0, 45, "°"), ("sPhase", "회전", 0, 359, "°")]),
    ("초", [("kNum", "최대 개수", 0, 5, "개"), ("kScale", "크기 배율", 50, 220),
            ("kR", "반경", 0, 60), ("kDy", "위/아래", -60, 60),
            ("kPhase", "추가 회전", -60, 60, "°")]),
    ("스프링클", [("pNum", "최대 개수", 0, 80, "알"), ("pScale", "크기", 40, 260),
                  ("pSpread", "퍼짐", 20, 95), ("pDy", "위/아래", -60, 60)]),
]

TEMPLATE = r"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>케이크 합성기 — 토핑·데코 시뮬레이션</title>
<style>
  :root { --bg:#f7f6f4; --card:#fff; --ink:#1c1a18; --muted:#6f6a63; --line:#e3dfd9; --accent:#c2410c; --r:12px; }
  * { box-sizing:border-box; }
  body { margin:0; padding:24px 20px 60px; background:var(--bg); color:var(--ink);
    font:15px/1.6 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",Pretendard,system-ui,sans-serif;
    -webkit-font-smoothing:antialiased; }
  .wrap { max-width:1300px; margin:0 auto; }
  h1 { font-size:24px; margin:0 0 4px; letter-spacing:-.02em; }
  .sub { color:var(--muted); margin:0 0 20px; font-size:14px; }
  h2 { font-size:13px; margin:0 0 10px; color:var(--muted); font-weight:600;
       text-transform:uppercase; letter-spacing:.05em; }
  .layout { display:grid; grid-template-columns:minmax(0,1fr) 330px; gap:20px; align-items:start; }
  @media (max-width:980px){ .layout{ grid-template-columns:1fr; } }
  .card { background:var(--card); border:1px solid var(--line); border-radius:var(--r);
          padding:16px 18px; margin-bottom:14px; }
  .panel { position:sticky; top:16px; max-height:calc(100vh - 32px); overflow-y:auto; }

  .stage-wrap { border:1px solid var(--line); border-radius:var(--r); overflow:hidden; }
  .stage { position:relative; width:100%; }
  .stage img.base { display:block; width:100%; height:auto; }
  .stage img.spr { position:absolute; transform-origin:center; pointer-events:none; }
  .stage .rim { position:absolute; border:2px dashed rgba(225,29,72,.75); border-radius:50%;
                pointer-events:none; display:none; z-index:40; }
  body.show-rim .stage .rim { display:block; }

  .bg-checker { background-image:
      linear-gradient(45deg,#dcdad6 25%,transparent 25%,transparent 75%,#dcdad6 75%),
      linear-gradient(45deg,#dcdad6 25%,transparent 25%,transparent 75%,#dcdad6 75%);
    background-size:20px 20px; background-position:0 0,10px 10px; background-color:#fff; }
  .bg-white{background:#fff} .bg-dark{background:#24262b} .bg-pink{background:#fbe4ec}

  .row { display:flex; align-items:center; gap:10px; margin:8px 0; font-size:13.5px; }
  .row label { flex:0 0 78px; color:var(--muted); }
  .row input[type=range] { flex:1; accent-color:var(--ink); min-width:0; }
  .row output { flex:0 0 50px; text-align:right; font-variant-numeric:tabular-nums;
                font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12.5px; }
  .btns { display:flex; gap:5px; flex-wrap:wrap; }
  button { font:inherit; font-size:12.5px; padding:5px 10px; cursor:pointer; border:1px solid var(--line);
    background:#fff; color:var(--ink); border-radius:999px; transition:all .12s; }
  button:hover { border-color:#c9c3bb; }
  button[aria-pressed="true"] { background:var(--ink); color:#fff; border-color:var(--ink); }
  button.primary { background:var(--accent); color:#fff; border-color:var(--accent); }
  hr { border:0; border-top:1px solid var(--line); margin:12px 0; }
  pre { background:#faf8f5; border:1px solid var(--line); border-radius:8px; padding:11px;
        font-size:11px; line-height:1.45; overflow:auto; max-height:210px; margin:8px 0 0; }
  .note { font-size:12.5px; color:var(--muted); margin:0; }
  .note strong { color:var(--ink); }
  .parts { display:grid; grid-template-columns:repeat(auto-fit,minmax(126px,1fr)); gap:10px; }
  .part { border:1px solid var(--line); border-radius:10px; overflow:hidden; background:#fff; margin:0; }
  .part .box { display:flex; align-items:center; justify-content:center; height:118px; padding:10px; }
  .part .box img { max-width:100%; max-height:100%; }
  .part figcaption { font-size:11px; color:var(--muted); padding:5px 8px; border-top:1px solid var(--line);
                     display:flex; justify-content:space-between; gap:5px; }
  .part figcaption b { color:var(--ink); }
</style>
</head>
<body>
<div class="wrap">
  <h1>케이크 합성기</h1>
  <p class="sub">직접 그린 베이스에 생크림·토핑·초·스프링클을 얹습니다. 값을 정하고 아래 JSON 을 <code>layout.json</code> 으로 굳히면 됩니다.</p>

  <div class="layout">
    <div>
      <div class="stage-wrap bg bg-white">
        <div class="stage" id="stage">
          <img class="base" id="base" src="base.png" alt="케이크 베이스" />
          <div class="rim" id="rim"></div>
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <p class="note">
          <strong>위쪽 여백 __TOPMARGIN__px 확보.</strong> 베이스를 그림에 딱 맞춰 자르면 링 뒤쪽 생크림과 초가 캔버스 밖으로 나가 잘립니다.
          <b>위쪽에만</b> 넓혔습니다 — 폭을 늘리면 캔버스 폭 기준인 크기 값이 전부 어긋납니다.
        </p>
        <p class="note" style="margin-top:8px">
          <strong>생크림 링</strong>은 윗면 타원(<code id="ell"></code>) 위 계산 배치입니다. <b>측면 밀도</b>는 카메라와 평행한 앞/뒤를 1.0 으로 두고
          좌우 끝을 그 배율로 놓습니다 — 1 미만이면 측면이 성기게, 초과면 촘촘하게.
          <strong>토핑</strong>은 피보나치 배치, <strong>초</strong>는 안쪽 작은 타원 위에 <b>바닥 기준</b>으로 세웁니다(중심 기준이면 케이크에 파묻힙니다).
          <strong>스프링클</strong>은 알갱이 __NGRAIN__종을 시드 고정으로 흩뿌립니다.
        </p>
      </div>

      <div class="card">
        <h2>부품</h2>
        <div class="parts" id="parts"></div>
      </div>
    </div>

    <div class="panel">
      <div class="card">
        <h2>올린 개수 — 게임 동작</h2>
__SIM__
        <div class="btns" style="margin-top:8px">
          <button id="reshuffle">토핑 자리 다시 뽑기</button>
        </div>
        <p class="note" style="margin-top:9px">
          자리는 <b>최대 개수 기준으로 미리 계산된 고정 슬롯</b>입니다. 개수를 줄였다 늘려도
          이미 올린 것은 <b>안 움직입니다</b> — 게임에서 하는 일과 같습니다.
        </p>
      </div>
      <div class="card">
        <h2>토핑 고르기</h2>
        <div class="btns" id="top-pick"></div>
      </div>
      <div class="card">
        <h2>초 고르기</h2>
        <div class="btns" id="candle-pick"></div>
      </div>
      <details class="card">
        <summary style="cursor:pointer;font-size:13px;color:var(--muted);font-weight:600">배치 설계 — 슬롯을 다시 만듭니다</summary>
        <p class="note" style="margin:10px 0 14px">
          여기 값을 바꾸면 <b>고정 슬롯 자체가 새로 계산돼</b> 이미 올린 것도 움직입니다.
          <code>layout.json</code> 을 만드는 값이라 확정 뒤엔 건드릴 일이 없습니다.
        </p>
__SLIDERS__
      </details>
      <div class="card">
        <h2>보기</h2>
        <div class="btns">
          <button data-bg="white" aria-pressed="true">흰색</button>
          <button data-bg="checker" aria-pressed="false">체커</button>
          <button data-bg="dark" aria-pressed="false">어두움</button>
          <button data-bg="pink" aria-pressed="false">핑크</button>
        </div>
        <div class="btns" style="margin-top:7px">
          <button id="t-rim" aria-pressed="false">링 타원</button>
        </div>
        <hr />
        <div class="btns">
          <button id="reset">기본값</button>
          <button id="copy" class="primary">JSON 복사</button>
        </div>
        <pre id="out"></pre>
      </div>
    </div>
  </div>
</div>

<script>
const GEO = __GEO__;
const TOPPINGS = __TOPPINGS__;
const DECOS = __DECOS__;
const GRAINS = __GRAINS__;
const TOP_ORDER = __TOP_ORDER__;
const CANDLE_ORDER = __CANDLE_ORDER__;
const DEFAULTS = __DEFAULTS__;

let topping = TOP_ORDER[0];
let candle = CANDLE_ORDER[0];

const E = GEO.base.top_ellipse;
const stage = document.getElementById("stage");
const rimEl = document.getElementById("rim");
const out = document.getElementById("out");
document.getElementById("ell").textContent =
  `cx ${E.cx} · cy ${E.cy} · rx ${E.rx} · ry ${E.ry}`;

const v = id => +document.getElementById(id).value;
const START = -Math.PI / 2;   // 뒤쪽 가운데에서 시작 → 좌우 대칭

/** 시드 고정 난수 — make_layout.py 의 rnd() 와 같은 식이라 결과가 일치한다. */
function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/** 타원 위에 n 개를 놓을 각도(위치 각도 그대로).
 *  가중치·호길이·위치를 모두 같은 각도 p 로 계산해야 한다 — 예전에 가중치를 t 로 재고
 *  위치는 t-90도 로 그려서 90도 어긋났고, 측면 밀도를 낮추면 오히려 측면이 몰렸다.
 *  ⚠ make_layout.py 의 ring_angles() 와 같은 식. */
function ringAngles(n, rx, ry, side) {
  const STEPS = 4000, cum = [0];
  for (let i = 1; i <= STEPS; i++) {
    const p0 = START + 2*Math.PI*(i-1)/STEPS, p1 = START + 2*Math.PI*i/STEPS;
    const ds = Math.hypot(rx*(Math.cos(p1)-Math.cos(p0)), ry*(Math.sin(p1)-Math.sin(p0)));
    cum.push(cum[i-1] + ds * (side + (1 - side) * Math.abs(Math.sin((p0+p1)/2))));
  }
  const angles = [];
  for (let k = 0; k < n; k++) {
    let i = cum.findIndex(c => c >= cum[STEPS] * k / n);
    angles.push(START + 2*Math.PI*(i < 0 ? STEPS : i)/STEPS);
  }
  return angles;
}

function creamPlaces() {
  const rx = E.rx*v("cRx")/100, ry = E.ry*v("cRy")/100, dy = v("cDy")/100*E.ry;
  return ringAngles(v("cNum"), rx, ry, v("cSide")/100)
    .map(t => ({x: E.cx + rx*Math.cos(t), y: E.cy + ry*Math.sin(t) + dy, deg: 0}));
}

function toppingPlaces() {
  const n = v("sNum"), k = v("sSpread")/100, jit = v("sJit");
  const rx = E.rx*k, ry = E.ry*k, dy = v("sDy")/100*E.ry;
  const GOLD = Math.PI * (3 - Math.sqrt(5));
  return Array.from({length: n}, (_, i) => {
    const r = n === 1 ? 0 : Math.sqrt((i + 0.5) / n);   // 피보나치(해바라기) 배치
    const t = i * GOLD + v("sPhase")*Math.PI/180;
    return {x: E.cx + rx*r*Math.cos(t), y: E.cy + ry*r*Math.sin(t) + dy,
            deg: +((rnd(i)*2 - 1) * jit).toFixed(1)};
  });
}

/** 초 배치 — 개수마다 모양이 다르다. 1개는 정중앙, 2개는 중앙 수평, 3개부터 원.
 *  3개 이상이면 링을 돌려가며 토핑에서 가장 멀리 떨어지는 각도를 고른다.
 *  ⚠ make_layout.py 의 candle_places() 와 같은 식. */
function candlePlaces(n, avoid) {
  if (n <= 0) return [];
  const rx = E.rx*v("kR")/100, ry = E.ry*v("kR")/100;
  const cy = E.cy + v("kDy")/100*E.ry;
  if (n === 1) return [{x: E.cx, y: cy, deg: 0}];
  if (n === 2) return [-1, 1].map(s => ({x: E.cx + s*rx, y: cy, deg: 0}));

  const base = ringAngles(n, rx || 1e-6, ry || 1e-6, 1);
  const at = ph => base.map(t => ({x: E.cx + rx*Math.cos(t+ph), y: cy + ry*Math.sin(t+ph), deg: 0}));
  const W = GEO.base.w, H = GEO.base.h;
  const clearance = ph => Math.min(...at(ph).map(c =>
    Math.min(...avoid.map(t => Math.hypot((c.x-t.x)*W, (c.y-t.y)*H)))));
  let best = 0, bestC = -1;
  if (avoid.length) {
    for (let d = 0; d < 360; d += 3) {
      const c = clearance(d*Math.PI/180);
      if (c > bestC) { bestC = c; best = d*Math.PI/180; }
    }
  }
  return at(best + v("kPhase")*Math.PI/180);
}

function sprinklePlaces() {
  const n = v("pNum"), k = v("pSpread")/100, dy = v("pDy")/100*E.ry;
  const rx = E.rx*k, ry = E.ry*k;
  return Array.from({length: n}, (_, i) => {
    const t = rnd(i*3+1) * 2*Math.PI;
    const r = Math.sqrt(rnd(i*3+2));       // sqrt 를 씌워야 면적당 고르게 퍼진다
    return {x: E.cx + rx*r*Math.cos(t), y: E.cy + ry*r*Math.sin(t) + dy,
            deg: +(rnd(i*3+3)*360).toFixed(1), grain: i % GRAINS.length};
  });
}

/** 채우는 순서 — 앞에서 몇 개만 써도 고르게 퍼지도록 (farthest-point).
 *  ⚠ make_layout.py 의 spread_order() 와 같은 식. */
function spreadOrder(slots) {
  if (!slots.length) return [];
  const order = [0], rest = [...slots.keys()].slice(1);
  while (rest.length) {
    let best = 0, bestD = -1;
    rest.forEach((i, k) => {
      const d = Math.min(...order.map(j =>
        (slots[i].x-slots[j].x)**2 + (slots[i].y-slots[j].y)**2));
      if (d > bestD) { bestD = d; best = k; }
    });
    order.push(rest[best]); rest.splice(best, 1);
  }
  return order;
}

/** 토핑은 고정 슬롯 중 무작위로 고른다 (시드 고정 — 다시 뽑기 전엔 안 바뀐다) */
let pickSeed = 1;
function pickSubset(arr, k) {
  const idx = arr.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd(pickSeed*97 + i) * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, k).sort((a,b) => a-b).map(i => arr[i]);
}

function render() {
  for (const k in DEFAULTS) {
    const el = document.getElementById("o-" + k);
    if (el) el.textContent = (UNITS[k] ? v(k) + UNITS[k] : (v(k)/100).toFixed(2));
  }
  stage.querySelectorAll("img.spr").forEach(n => n.remove());

  // 최대 개수 기준 고정 슬롯 (= layout.json 에 굳는 값)
  const slotsCream = creamPlaces(), slotsTop = toppingPlaces(), slotsSpr = sprinklePlaces();
  // 시뮬레이션 슬라이더의 상한을 슬롯 수에 맞춘다
  SIM.forEach(([sim, , design, step]) => {
    const el = document.getElementById(sim);
    el.max = Math.floor(v(design) / step);
    if (+el.value > +el.max) el.value = el.max;
  });
  // 그 자리에서 골라 쓴다 — 재계산이 아니라 부분 사용
  const cream = spreadOrder(slotsCream).slice(0, v("nCream")).map(i => slotsCream[i]);
  const tops = pickSubset(slotsTop, v("nTop"));
  const spr = slotsSpr.slice(0, v("nSpr") * SPRINKLE_PER_CLICK);   // 클릭당 6알
  const candles = candlePlaces(v("nCandle"), slotsTop);
  const items = [
    ...cream.map(p => ({...p, src:"cream.png", size:v("cSize")/1000, anchor:"center", z:1})),
    ...tops.map(p  => ({...p, src:TOPPINGS[topping].file, size:v("sSize")/1000, anchor:"center", z:2})),
    // 스프링클은 마지막에 뿌리는 것 → 토핑 위. 초는 세워 꽂으니 맨 위.
    ...spr.map(p   => ({...p, src:GRAINS[p.grain].file,
                        size:GRAINS[p.grain].size * v("pScale")/100, anchor:"center", z:3})),
    // 초는 종류마다 그려진 크기가 달라 고유 크기 × 전역 배율로 둔다
    ...candles.map(p => ({...p, src:DECOS[candle].file,
                          size:DECOS[candle].size * v("kScale")/100, anchor:"bottom", z:4})),
  ].sort((a,b) => (a.z - b.z) || (a.y - b.y));   // 층 먼저, 같은 층은 뒤에서 앞으로

  for (const it of items) {
    const img = document.createElement("img");
    img.className = "spr"; img.src = it.src; img.alt = "";
    img.style.left = (it.x*100) + "%";
    img.style.width = (it.size*100) + "%";
    if (it.anchor === "bottom") {
      img.style.top = (it.y*100) + "%";
      img.style.transform = `translate(-50%,-100%) rotate(${it.deg}deg)`;
      img.style.transformOrigin = "center bottom";
    } else {
      img.style.top = (it.y*100) + "%";
      img.style.transform = `translate(-50%,-50%) rotate(${it.deg}deg)`;
    }
    stage.appendChild(img);
  }

  const rx = E.rx*v("cRx")/100, ry = E.ry*v("cRy")/100, dy = v("cDy")/100*E.ry;
  Object.assign(rimEl.style, {left:((E.cx-rx)*100)+"%", top:((E.cy+dy-ry)*100)+"%",
                              width:(rx*200)+"%", height:(ry*200)+"%"});

  const r4 = p => ({x:+p.x.toFixed(4), y:+p.y.toFixed(4), deg:p.deg});
  out.textContent = JSON.stringify({
    base: "base.png", canvas: {w: GEO.base.w, h: GEO.base.h},
    cream: {sprite:"cream.png", size:+(v("cSize")/1000).toFixed(4),
            slots: slotsCream.map(r4), fill_order: spreadOrder(slotsCream)},
    topping: {id: topping, sprite: TOPPINGS[topping].file,
              size:+(v("sSize")/1000).toFixed(4),
              slots: slotsTop.map(r4), fill_order: spreadOrder(slotsTop)},
    candle: {id: candle, sprite: DECOS[candle].file, anchor:"bottom",
             scale:+(v("kScale")/100).toFixed(2),
             size:+(DECOS[candle].size * v("kScale")/100).toFixed(4),
             arrangements: Object.fromEntries(
               Array.from({length: v("kNum")}, (_, i) =>
                 [i+1, candlePlaces(i+1, slotsTop).map(r4)]))},
    sprinkle: {scale:+(v("pScale")/100).toFixed(2),
               per_click: SPRINKLE_PER_CLICK,
               max_clicks: Math.floor(v("pNum")/SPRINKLE_PER_CLICK),
               slots: slotsSpr.map(p => ({...r4(p), grain:p.grain}))},
    params: Object.fromEntries(Object.keys(DEFAULTS).map(k => [k, v(k)])),
  }, null, 1);
}

// 부품 갤러리
document.getElementById("parts").innerHTML = [
  ...TOP_ORDER.map(id => [TOPPINGS[id].file, LABELS[id], TOPPINGS[id].size.toFixed(3)]),
  ...CANDLE_ORDER.map(id => [DECOS[id].file, LABELS[id], DECOS[id].size.toFixed(3)]),
  ["cream.png", "생크림", ""], ["decos/sprinkle.png", "스프링클", ""], ["sheet.png", "시트(미사용)", ""],
].map(([f,l,s]) => `<figure class="part"><div class="box bg bg-checker">
  <img src="${f}" alt="${l}" /></div><figcaption><b>${l}</b><span>${s}</span></figcaption></figure>`).join("");

// 토핑 / 초 선택 — 바꾸면 크기 슬라이더가 그 부품의 상대 크기로 자동 설정된다
function picker(elId, order, table, sizeSlider, get, set) {
  const el = document.getElementById(elId);
  el.innerHTML = order.map(id =>
    `<button data-id="${id}" aria-pressed="${id===get()}">${LABELS[id]}</button>`).join("");
  el.addEventListener("click", e => {
    const b = e.target.closest("[data-id]"); if (!b) return;
    set(b.dataset.id);
    el.querySelectorAll("[data-id]").forEach(o =>
      o.setAttribute("aria-pressed", String(o.dataset.id === get())));
    if (sizeSlider) document.getElementById(sizeSlider).value = Math.round(table[get()].size * 1000);
    render();
  });
}
picker("top-pick", TOP_ORDER, TOPPINGS, "sSize", () => topping, x => topping = x);
picker("candle-pick", CANDLE_ORDER, DECOS, null, () => candle, x => candle = x);

Object.keys(DEFAULTS).forEach(k =>
  document.getElementById(k).addEventListener("input", render));

const bgs = ["bg-checker","bg-white","bg-dark","bg-pink"];
document.querySelectorAll("[data-bg]").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".bg").forEach(el => {
    bgs.forEach(c => el.classList.remove(c)); el.classList.add("bg-" + b.dataset.bg); });
  document.querySelectorAll("[data-bg]").forEach(o =>
    o.setAttribute("aria-pressed", String(o === b)));
}));
document.getElementById("t-rim").addEventListener("click", e => {
  const on = e.target.getAttribute("aria-pressed") !== "true";
  e.target.setAttribute("aria-pressed", String(on));
  document.body.classList.toggle("show-rim", on);
});
document.getElementById("reset").addEventListener("click", () => {
  for (const k in DEFAULTS) document.getElementById(k).value = DEFAULTS[k];
  render();
});
document.getElementById("copy").addEventListener("click", async e => {
  try { await navigator.clipboard.writeText(out.textContent); e.target.textContent = "복사됨"; }
  catch { e.target.textContent = "복사 실패 — 직접 선택"; }
  setTimeout(() => e.target.textContent = "JSON 복사", 1400);
});

document.getElementById("reshuffle").addEventListener("click", () => { pickSeed++; render(); });

render();
</script>
</body>
</html>
"""


def main():
    geo = json.loads((BUILD / "geometry.json").read_text(encoding="utf-8"))
    tops = json.loads((BUILD / "toppings.json").read_text(encoding="utf-8"))["toppings"]
    decos = json.loads((BUILD / "decos.json").read_text(encoding="utf-8"))

    toppings = {i: {"file": tops[i]["file"], "size": tops[i]["size"]} for i in TOP_ORDER}
    deco_out = {i: {"file": decos[i]["file"], "size": decos[i]["size"]} for i in CANDLES}
    grains = [{"file": g["file"], "size": g["size"]} for g in decos["sprinkle"]["grains"]]

    defaults = dict(PARAMS)

    units, rows = {}, []
    for title, group in SLIDERS:
        body = []
        for item in group:
            key, label, lo, hi = item[:4]
            unit = item[4] if len(item) > 4 else None
            if unit:
                units[key] = unit
            body.append(f'        <div class="row"><label>{label}</label>'
                        f'<input type="range" id="{key}" min="{lo}" max="{hi}" '
                        f'value="{defaults[key]}"><output id="o-{key}"></output></div>')
        rows.append(f'        <div style="margin-bottom:14px">\n'
                    f'          <h2>{title}</h2>\n'
                    + "\n".join(body) + "\n        </div>")

    sim_rows = []
    for sim, label, design, step in SIM:
        # 스프링클은 클릭 단위로 센다 — 한 번에 6알씩 통으로 올라간다
        units[sim] = "클릭" if step > 1 else "개"
        defaults[sim] = defaults[design] // step
        sim_rows.append(f'        <div class="row"><label>{label}</label>'
                        f'<input type="range" id="{sim}" min="0" max="{defaults[design]//step}" '
                        f'value="{defaults[design]//step}"><output id="o-{sim}"></output></div>')

    html = (TEMPLATE
            .replace("__SIM__", "\n".join(sim_rows))
            .replace("const GEO =", "const SIM = "
                     + json.dumps([list(x) for x in SIM])
                     + f";\nconst SPRINKLE_PER_CLICK = {SPRINKLE_PER_CLICK};\nconst GEO =")
            .replace("__GEO__", json.dumps(geo, ensure_ascii=False))
            .replace("__TOPPINGS__", json.dumps(toppings, ensure_ascii=False))
            .replace("__DECOS__", json.dumps(deco_out, ensure_ascii=False))
            .replace("__GRAINS__", json.dumps(grains, ensure_ascii=False))
            .replace("__TOP_ORDER__", json.dumps(TOP_ORDER))
            .replace("__CANDLE_ORDER__", json.dumps(CANDLES))
            .replace("__DEFAULTS__", json.dumps(defaults))
            .replace("__SLIDERS__", "\n".join(rows))
            .replace("__TOPMARGIN__", str(geo["base"].get("top_margin", 0)))
            .replace("__NGRAIN__", str(len(grains)))
            .replace("const GEO =",
                     "const LABELS = " + json.dumps(LABEL, ensure_ascii=False)
                     + ";\nconst UNITS = " + json.dumps(units, ensure_ascii=False)
                     + ";\nconst GEO ="))

    (BUILD / "compose.html").write_text(html, encoding="utf-8")
    print(f"  슬라이더 {len(units) + sum(len(g) for _, g in SLIDERS) - len(units)}개 · "
          f"토핑 {len(toppings)}종 · 초 {len(deco_out)}종 · 알갱이 {len(grains)}종")
    print(f"  → {BUILD / 'compose.html'}")


if __name__ == "__main__":
    main()
