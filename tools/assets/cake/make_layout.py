"""확정된 크기·개수로 layout.json 과 미리보기를 만든다.

**배치는 전부 정적이다.** 최대 개수 기준으로 자리를 한 번 계산해 layout.json 에 굳히고,
게임은 그 자리에 하나씩 올리기만 한다. 개수가 늘 때마다 다시 계산하면 이미 올린 토핑까지
움직인다(1→2개일 때 131px, 캔버스 폭의 14%). 게임에서 런타임 계산은 하지 않는다.
  · 생크림 19자리 · 토핑 14자리 · 스프링클 34자리 — 앞에서부터 또는 무작위로 골라 쓴다
  · 초는 개수마다 모양이 다르므로(1=정중앙, 2=수평, 3+=원) 1~5개 배치를 전부 미리 넣어둔다

compose.html 에서 슬라이더로 정한 값을 여기에 굳힌다. 원본 그림이 바뀌면
build_cake.py 를 다시 돌린 뒤 이 스크립트를 돌리면 배치가 따라온다.

⚠ 배치 계산은 compose.html 의 JS 와 같은 식이다(대화형 도구 vs 산출물 생성기).
   한쪽을 고치면 다른 쪽도 같이 고쳐야 한다 — layout.json 의 params 블록으로 대조할 것.
"""

import json
import math
from pathlib import Path

from PIL import Image

from split_cake_parts import HERE

BUILD = HERE / "build"

# compose.html 에서 정한 값 (슬라이더 눈금 그대로)
PARAMS = dict(
    cSize=114, cNum=19, cRx=86, cRy=76, cDy=-21, cSide=160,
    sSize=78, sNum=14, sSpread=60, sDy=-29, sJit=24,
    # 데코 — 초는 최대 5개, 스프링클은 알갱이를 흩뿌린다
    kNum=5, kScale=132, kR=46, kDy=2, kPhase=0,
    sPhase=0,
    pNum=36, pScale=110, pSpread=76, pDy=-20,
)
CANDLES = ["birthday_candle", "heart_candle_red", "heart_candle_pink", "heart_candle_blue", "bomb_candle"]
SPRINKLE_PER_CLICK = 6


def rnd(i):
    """시드 고정 난수 — JS 쪽과 같은 식이라 결과가 일치한다."""
    x = math.sin(i * 127.1 + 311.7) * 43758.5453
    return x - math.floor(x)


START = -math.pi / 2          # 뒤쪽 가운데에서 시작 → 좌우가 대칭으로 놓인다


def ring_angles(n, rx, ry, side_density, steps=4000):
    """타원 위에 n 개를 놓을 각도. 반환값은 '위치 각도' 그대로다.

    각도를 등분하면 좌우 끝에서 몰린다. 그래서 호 길이로 나누되,
    카메라와 평행한 앞/뒤(접선이 수평)를 1.0, 측면(좌우 끝)을 side_density 로 두고
    '가중 호 길이' 가 같도록 나눈다. 가중치가 낮은 구간일수록 성기게 놓인다.
    side_density < 1 이면 측면이 성기고, > 1 이면 측면이 앞/뒤보다 촘촘해진다.
    = 1 이면 순수 호 길이 등간격. (0 초과면 어떤 값이든 유효 — 가중치가 음수가 되지 않는다)

    ⚠ 가중치·호길이·위치를 모두 같은 각도 p 로 계산해야 한다. 예전엔 가중치를
      파라미터 t 로 재고 위치는 t-90도 로 그려서 90도 어긋났고, 그래서 측면 밀도를
      낮추면 오히려 측면이 몰렸다.
    """
    def weight(p):                       # |sin p| : 앞/뒤(p=±90도) = 1, 좌우 끝(p=0,180도) = 0
        return side_density + (1.0 - side_density) * abs(math.sin(p))

    cum = [0.0]
    for i in range(1, steps + 1):
        p0 = START + 2 * math.pi * (i - 1) / steps
        p1 = START + 2 * math.pi * i / steps
        ds = math.hypot(rx * (math.cos(p1) - math.cos(p0)),
                        ry * (math.sin(p1) - math.sin(p0)))
        cum.append(cum[-1] + ds * weight((p0 + p1) / 2))

    total = cum[-1]
    angles = []
    for k in range(n):
        target = total * k / n
        i = next((j for j, c in enumerate(cum) if c >= target), steps)
        angles.append(START + 2 * math.pi * i / steps)
    return angles


def build(geo, p, decos):
    e = geo["base"]["top_ellipse"]
    rx, ry = e["rx"] * p["cRx"] / 100, e["ry"] * p["cRy"] / 100
    dy = p["cDy"] / 100 * e["ry"]
    cream = [{
        "x": round(e["cx"] + rx * math.cos(t), 4),
        "y": round(e["cy"] + ry * math.sin(t) + dy, 4),
        "deg": 0,                                  # 생크림은 거의 정원 → 회전은 노이즈
    } for t in ring_angles(p["cNum"], rx, ry, p["cSide"] / 100)]

    k = p["sSpread"] / 100
    srx, sry = e["rx"] * k, e["ry"] * k
    sdy = p["sDy"] / 100 * e["ry"]
    gold = math.pi * (3 - math.sqrt(5))
    phase = math.radians(p["sPhase"])
    n = p["sNum"]
    straw = []
    for i in range(n):
        r = 0.0 if n == 1 else math.sqrt((i + 0.5) / n)   # 피보나치(해바라기) 배치
        t = i * gold + phase
        straw.append({
            "x": round(e["cx"] + srx * r * math.cos(t), 4),
            "y": round(e["cy"] + sry * r * math.sin(t) + sdy, 4),
            "deg": round((rnd(i) * 2 - 1) * p["sJit"], 1),
        })

    # 초 — 개수마다 배치가 다르다. 세워 꽂으므로 기준점은 바닥(anchor="bottom").
    wh = (geo["base"]["w"], geo["base"]["h"])
    arrangements = {n: candle_places(e, p, n, avoid=straw, aspect=wh)
                    for n in range(1, p["kNum"] + 1)}
    candle = arrangements.get(p["kNum"], [])

    # 스프링클 — 윗면 안에 시드 고정으로 흩뿌린다. 게임은 앞에서 필요한 개수만 쓴다.
    prx, pry = e["rx"] * p["pSpread"] / 100, e["ry"] * p["pSpread"] / 100
    pdy = p["pDy"] / 100 * e["ry"]
    sprinkle = []
    for i in range(p["pNum"]):
        t = rnd(i * 3 + 1) * 2 * math.pi
        r = math.sqrt(rnd(i * 3 + 2))          # sqrt 를 씌워야 면적당 고르게 퍼진다
        sprinkle.append({
            "x": round(e["cx"] + prx * r * math.cos(t), 4),
            "y": round(e["cy"] + pry * r * math.sin(t) + pdy, 4),
            "deg": round(rnd(i * 3 + 3) * 360, 1),
            "grain": i,                         # grains 배열 인덱스 (순환해서 씀)
        })

    return {
        "base": "base.png",
        "canvas": {"w": geo["base"]["w"], "h": geo["base"]["h"]},
        # 초는 슬롯을 나눠 쓰지 않는다 — 개수마다 배치가 통째로 다르다.
        # 초는 종류마다 그려진 크기가 다르다 — 절대 크기 하나로 묶으면
        # 종류를 바꿀 때마다 커지거나 작아진다. 고유 크기 × 전역 배율로 둔다.
        "candle": {"types": CANDLES, "anchor": "bottom",
                   "scale": p["kScale"] / 100,
                   "size": {c: round(decos[c]["size"] * p["kScale"] / 100, 4)
                            for c in CANDLES},
                   "arrangements": {str(k): v for k, v in arrangements.items()}},
        # 스프링클은 한 번 클릭에 per_click 알씩 통으로 올라간다 → 슬롯 수는 그 배수
        "sprinkle": {"sprite": "decos/sprinkle.png", "anchor": "center",
                     "scale": p["pScale"] / 100, "per_click": SPRINKLE_PER_CLICK,
                     "max_clicks": p["pNum"] // SPRINKLE_PER_CLICK,
                     # 퍼짐 순서(farthest-point)는 첫 6알이 가장자리에 붙어 링처럼 보인다.
                     # 뿌린 느낌은 무작위 순서가 낫다 — 슬롯 순서 그대로 앞에서부터 쓴다.
                     "slots": sprinkle,
                     "grains": [g["file"] for g in decos["sprinkle"]["grains"]]},
        # slots = 고정 자리. 게임은 여기에 토핑을 하나씩 꽂는다.
        #   딸기  — 슬롯을 무작위로 골라 채운다 (회전 deg 는 슬롯에 붙어 있어 자리마다 일정)
        #   생크림 — 슬롯 순서대로 채우되, 부분만 올릴 땐 fill_order 를 쓰면 고르게 퍼진다
        "cream": {"sprite": "cream.png", "size": p["cSize"] / 1000,
                  "slots": cream, "fill_order": spread_order(cream)},
        "strawberry": {"sprite": "strawberry.png", "size": p["sSize"] / 1000,
                       "slots": straw, "fill_order": spread_order(straw)},
        "params": p,
    }


def candle_places(e, p, n, avoid=None, aspect=(1, 1)):
    """초 배치 — 개수마다 모양이 다르다.

    1개는 정중앙, 2개는 중앙에 수평으로, 3개부터는 원(타원) 배치.
    2개까지 원에 올리면 뒤/앞으로 어긋나 서서 어색하다.
    avoid(토핑 자리)를 주면 링 위상을 돌려가며 토핑에서 가장 멀리 떨어지는 각도를 고른다.
    kPhase 는 그 위에 얹는 수동 보정.
    """
    krx, kry = e["rx"] * p["kR"] / 100, e["ry"] * p["kR"] / 100
    cy = e["cy"] + p["kDy"] / 100 * e["ry"]
    if n <= 0:
        return []
    if n == 1:
        return [{"x": round(e["cx"], 4), "y": round(cy, 4), "deg": 0}]
    if n == 2:
        return [{"x": round(e["cx"] + s * krx, 4), "y": round(cy, 4), "deg": 0}
                for s in (-1, 1)]
    base = ring_angles(n, krx, kry, 1.0)

    def at(ph):
        return [(e["cx"] + krx * math.cos(t + ph), cy + kry * math.sin(t + ph)) for t in base]

    manual = math.radians(p["kPhase"])
    if avoid:
        # 토핑에서 가장 멀리 떨어지는 위상을 고른다. x·y 는 각각 폭·높이로 정규화돼
        # 있으므로 픽셀로 환산해 재야 실제 거리가 된다.
        W, H = aspect
        def clearance(ph):
            return min(min(math.hypot((x - t["x"]) * W, (y - t["y"]) * H) for t in avoid)
                       for x, y in at(ph))
        manual += max((math.radians(d) for d in range(0, 360, 3)), key=clearance)
    return [{"x": round(x, 4), "y": round(y, 4), "deg": 0} for x, y in at(manual)]


def spread_order(slots):
    """링 슬롯을 채우는 순서 — 앞에서 몇 개만 써도 고르게 퍼지도록.

    인덱스 순서대로 채우면 4/19 개일 때 뒤쪽에 몰린 호가 된다.
    이미 고른 자리에서 가장 먼 자리를 계속 고르는 방식(farthest-point).
    """
    if not slots:
        return []
    order = [0]
    rest = list(range(1, len(slots)))
    while rest:
        best = max(rest, key=lambda i: min(
            (slots[i]["x"] - slots[j]["x"]) ** 2 + (slots[i]["y"] - slots[j]["y"]) ** 2
            for j in order))
        order.append(best)
        rest.remove(best)
    return order


def render(layout, out):
    base = Image.open(BUILD / layout["base"]).convert("RGBA")
    W, H = base.size
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.alpha_composite(base)
    spr = {k: Image.open(BUILD / layout[k]["sprite"]).convert("RGBA")
           for k in ("cream", "strawberry")}
    items = [dict(it, t=k, size=layout[k]["size"])
             for k in ("cream", "strawberry") for it in layout[k]["slots"]]
    for it in sorted(items, key=lambda d: d["y"]):      # 뒤에서 앞으로 그려야 겹침이 맞다
        s = spr[it["t"]]
        w = max(1, int(it["size"] * W))
        im = s.resize((w, max(1, round(w * s.size[1] / s.size[0]))), Image.LANCZOS)
        if it["deg"]:
            im = im.rotate(-it["deg"], resample=Image.BICUBIC, expand=True)
        canvas.alpha_composite(im, (int(it["x"] * W - im.size[0] / 2),
                                    int(it["y"] * H - im.size[1] / 2)))
    canvas.save(out)
    return canvas


def main():
    geo = json.loads((BUILD / "geometry.json").read_text(encoding="utf-8"))
    decos = json.loads((BUILD / "decos.json").read_text(encoding="utf-8"))
    layout = build(geo, PARAMS, decos)
    (BUILD / "layout.json").write_text(json.dumps(layout, ensure_ascii=False, indent=1),
                                       encoding="utf-8")
    render(layout, BUILD / "cake_preview.png")
    print(f"  생크림 슬롯 {len(layout['cream']['slots'])}개 (측면 밀도 {PARAMS['cSide']/100:.2f}) · "
          f"딸기 슬롯 {len(layout['strawberry']['slots'])}개")
    print(f"  → {BUILD/'layout.json'}\n  → {BUILD/'cake_preview.png'}")
    return layout


if __name__ == "__main__":
    main()
