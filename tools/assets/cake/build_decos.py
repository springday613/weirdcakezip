"""데코 시트 → 개별 스프라이트.

토핑과 다른 점 두 가지.

1. **스프링클은 알갱이가 20여 개로 흩어져 있다.** 연결성분을 그대로 쓰면 알갱이 하나가
   개체 하나가 된다. 그래서 오른쪽 무리를 통째로 묶은 `sprinkle.png`(오버레이용)와
   알갱이 낱개(`sprinkle_grains/`)를 둘 다 뽑는다. 낱개가 있으면 프론트에서 개수만큼
   흩뿌릴 수 있다.
2. **초는 세워서 꽂는 물건이라 기준점이 중심이 아니라 바닥**이다. 토핑처럼 중심을
   슬롯에 맞추면 케이크에 반쯤 파묻힌다. anchor 를 같이 기록한다.

    python3 build_decos.py

출력: build/decos/*.png · build/decos/sprinkle_grains/*.png · build/decos.json
"""

import json
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

from split_cake_parts import hsv, rgba, HERE

SRC = "decos.png"
OUT = HERE / "build" / "decos"
GRAINS = OUT / "sprinkle_grains"

CANDLES = ["birthday_candle", "heart_candle", "bomb_candle"]

# 초를 통째로 키우면 불꽃(과 폭탄)까지 커진다. 세로로 늘어나야 할 부분만 늘린다.
#   생일초 : 줄무늬 몸통(넓은 부분)
#   하트초 : 하트 아래 대(좁은 부분)
#   폭탄초 : 대가 없어서 하트초 대를 떼어 붙인다
# 생일초 길이는 하트초와 같게 맞춘다. 화면 높이 = size(폭 비율) × 스프라이트 h/w 이므로
# 그 값이 하트초와 같아지도록 스프라이트 높이를 역산한다.
MATCH_HEIGHT_TO = "heart_candle"
HEART_STICK = 1.50
BOMB_STICK_LEN = 0.55     # 폭탄 지름 대비 대 길이
MIN_AREA = 300          # 알갱이도 살려야 해서 토핑보다 낮게
GAP = 60                # 이 간격 이상 떨어지면 다른 무리
ANCHOR_K = 0.095 / 170  # toppings 시트의 딸기(170px → 0.095) 와 같은 척도


def foreground(a):
    H, S, V = hsv(a)
    warm = a[..., 1] - a[..., 2]
    L = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    return ndi.binary_closing((warm > 2) | (L < 205) | (S > 0.25), np.ones((5, 5)))


def widths(img):
    return (np.asarray(img)[..., 3] > 8).sum(1)


def stretch_below(img, y0, factor):
    """y0 아래만 세로로 늘린다. 위쪽(불꽃·하트·폭탄)은 손대지 않는다."""
    lower = img.crop((0, y0, img.size[0], img.size[1]))
    bh = max(1, round(lower.size[1] * factor))
    lower = lower.resize((lower.size[0], bh), Image.LANCZOS)
    out = Image.new("RGBA", (img.size[0], y0 + bh), (0, 0, 0, 0))
    out.paste(img.crop((0, 0, img.size[0], y0)), (0, 0))
    out.paste(lower, (0, y0))
    return out


def body_top(img):
    """넓은 몸통이 시작되는 행 (생일초) — 폭이 최대폭의 60% 를 처음 넘는 지점."""
    w = widths(img)
    return int(np.argmax(w > w.max() * 0.6))


def stick_top(img):
    """가는 대가 시작되는 행 (하트초) — 가장 넓은 지점을 지나 폭이 35% 아래로 떨어지는 곳."""
    w = widths(img)
    peak = int(np.argmax(w))
    below = np.where(w[peak:] < w.max() * 0.35)[0]
    return peak + int(below[0]) if below.size else img.size[1]


def take_stick(img, skip=0.30):
    """하트초에서 대만 잘라낸다 (폭탄초에 붙이려고).

    stick_top 은 폭이 좁아지는 지점이라 하트의 뾰족한 끝이 조금 딸려온다.
    대 길이의 skip 만큼 위를 버려야 분홍이 안 묻어난다.
    """
    top = stick_top(img)
    top += int((img.size[1] - top) * skip)
    return img.crop((0, top, img.size[0], img.size[1]))


def attach_stick(img, stick, length):
    """대가 없는 초(폭탄초) 아래에 대를 붙인다. 가로 가운데 정렬."""
    sw = max(1, round(stick.size[0]))
    sh = max(1, round(length))
    st = stick.resize((sw, sh), Image.LANCZOS)
    out = Image.new("RGBA", (max(img.size[0], sw), img.size[1] + sh), (0, 0, 0, 0))
    out.paste(img, ((out.size[0] - img.size[0]) // 2, 0))
    out.alpha_composite(st, ((out.size[0] - sw) // 2, img.size[1]))
    return out


def cut(a, mask, pad=6):
    ys, xs = np.where(mask)
    y = slice(max(0, ys.min() - pad), min(a.shape[0], ys.max() + pad + 1))
    x = slice(max(0, xs.min() - pad), min(a.shape[1], xs.max() + pad + 1))
    return rgba(a[y, x], mask[y, x]), int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    GRAINS.mkdir(exist_ok=True)
    real = {unicodedata.normalize("NFC", p.name): p for p in HERE.iterdir()}
    a = np.asarray(Image.open(real[SRC]).convert("RGB")).astype(np.float32)

    lab, n = ndi.label(foreground(a))
    sizes = ndi.sum(np.ones_like(lab, bool), lab, range(1, n + 1))
    slices = ndi.find_objects(lab)
    comps = sorted(((i + 1, slices[i]) for i in range(n) if sizes[i] > MIN_AREA),
                   key=lambda t: t[1][1].start)

    # x 간격으로 무리 나누기 — 초는 각자 한 무리, 스프링클은 알갱이가 한 무리로 묶인다
    groups, cur, prev_end = [], [], None
    for i, sl in comps:
        if prev_end is not None and sl[1].start - prev_end > GAP:
            groups.append(cur); cur = []
        cur.append((i, sl))
        prev_end = max(prev_end or 0, sl[1].stop)
    groups.append(cur)

    if len(groups) != len(CANDLES) + 1:
        raise SystemExit(f"무리 {len(groups)}개 — 초 {len(CANDLES)}종 + 스프링클 1무리를 "
                         f"기대했다. GAP({GAP}) 을 조정할 것")

    out = {}
    done = {}
    raw = {}
    for name, g in zip(CANDLES, groups):
        m = ndi.binary_fill_holes(np.isin(lab, [i for i, _ in g]))
        raw[name] = cut(a, m)

    # 하트초 대를 먼저 만들어 둔다 — 폭탄초에도 같은 대를 쓴다
    heart = raw["heart_candle"][0]
    stick = take_stick(heart)

    for name, (img, x0, x1, y0, y1) in raw.items():
        if name == "birthday_candle":
            pass                                   # 하트초 높이를 안 뒤에 처리
        elif name == "heart_candle":
            img = stretch_below(img, stick_top(img), HEART_STICK)
        elif name == "bomb_candle":
            img = attach_stick(img, stick, img.size[1] * BOMB_STICK_LEN)
        done[name] = (img, x1 - x0 + 1)

    # 생일초 — 하트초와 화면 길이가 같아지도록 몸통을 늘린다
    ref_img, ref_w = done[MATCH_HEIGHT_TO]
    ref_h = ref_w * ANCHOR_K * ref_img.size[1] / ref_img.size[0]     # 화면 높이(캔버스 폭 대비)
    b_img, b_w = done["birthday_candle"]
    target_px = ref_h / (b_w * ANCHOR_K) * b_img.size[0]
    body = body_top(b_img)
    b_img = stretch_below(b_img, body, (target_px - body) / max(1, b_img.size[1] - body))
    done["birthday_candle"] = (b_img, b_w)

    for name, (img, pw) in done.items():
        img.save(OUT / f"{name}.png")
        out[name] = dict(file=f"decos/{name}.png", px_w=img.size[0], px_h=img.size[1],
                         size=round(pw * ANCHOR_K, 4),
                         anchor="bottom")     # 세워 꽂는 물건 → 바닥이 기준

    # 스프링클: 무리 전체 + 알갱이 낱개
    grain_ids = [i for i, _ in groups[-1]]
    m_all = np.isin(lab, grain_ids)
    img, x0, x1, y0, y1 = cut(a, m_all, pad=10)
    img.save(OUT / "sprinkle.png")
    grains = []
    for k, i in enumerate(grain_ids):
        gi, gx0, gx1, gy0, gy1 = cut(a, ndi.binary_fill_holes(lab == i), pad=3)
        gi.save(GRAINS / f"grain_{k:02d}.png")
        grains.append(dict(file=f"decos/sprinkle_grains/grain_{k:02d}.png",
                           px_w=gx1 - gx0 + 1, px_h=gy1 - gy0 + 1,
                           size=round((gx1 - gx0 + 1) * ANCHOR_K, 4)))
    out["sprinkle"] = dict(file="decos/sprinkle.png", px_w=x1 - x0 + 1, px_h=y1 - y0 + 1,
                           size=round((x1 - x0 + 1) * ANCHOR_K, 4),
                           anchor="center", grains=grains)

    (HERE / "build" / "decos.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

    for k, v in out.items():
        extra = f" · 알갱이 {len(v['grains'])}개" if "grains" in v else ""
        print(f"  {k:17s} 시트 {v['px_w']:>3}x{v['px_h']:<3} → size {v['size']:.4f} "
              f"(anchor {v['anchor']}){extra}")
    print(f"\n→ {OUT}")
    return out


if __name__ == "__main__":
    main()
