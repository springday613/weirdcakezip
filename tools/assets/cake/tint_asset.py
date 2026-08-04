"""스프라이트의 특정 색 영역만 다른 색으로 갈아끼운다.

하트초의 빨간 하트만 핑크로 바꾸는 것처럼, 불꽃(노랑)·심지(갈색)·막대(흰색)는 두고
지정한 색상 대역만 건드린다.

**multiply 틴팅은 여기서 못 쓴다.** 흰 바탕 그림에는 잘 먹지만(흰색→틴트색),
이미 채도 높은 빨강에 곱하면 거의 안 변한다 — 빨강 × 핑크 = 여전히 빨강.
그래서 HSV 로 바꿔 **색상은 목표값으로 갈아끼우고, 채도는 비율로 줄이고, 명도는 그대로 둔다.**
명도를 보존해야 연필 결이 살아남는다.

    python3 tint_asset.py            # 하트초 핑크 후보 생성
"""

import colorsys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

from split_cake_parts import HERE

BUILD = HERE / "build"


def hsv_of(a):
    x = a / 255.0
    mx, mn = x.max(2), x.min(2)
    d = mx - mn
    R, G, B = x[..., 0], x[..., 1], x[..., 2]
    h = np.zeros_like(mx)
    m = d > 1e-6
    r = m & (mx == R)
    g = m & (mx == G) & ~r
    b = m & (mx == B) & ~r & ~g
    h[r] = ((G - B)[r] / d[r]) % 6
    h[g] = ((B - R)[g] / d[g]) + 2
    h[b] = ((R - G)[b] / d[b]) + 4
    return h * 60, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0), mx


def hsv_to_rgb(h, s, v):
    i = np.floor(h / 60.0) % 6
    f = h / 60.0 - np.floor(h / 60.0)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    out = np.zeros(h.shape + (3,), np.float32)
    for k, (rr, gg, bb) in enumerate([(v, t, p), (q, v, p), (p, v, t),
                                      (p, q, v), (t, p, v), (v, p, q)]):
        m = i == k
        out[m] = np.stack([rr, gg, bb], -1)[m]
    return out * 255.0


def hue_mask(a, lo, hi, min_sat=0.30):
    """색상 대역으로 영역을 고른다. lo>hi 면 0도를 넘어가는 구간(빨강)."""
    H, S, V = hsv_of(a)
    band = (H >= lo) | (H <= hi) if lo > hi else (H >= lo) & (H <= hi)
    return band & (S >= min_sat)


def retint(path, mask, hue, sat_scale=1.0, val_lift=0.0):
    """mask 영역의 색상을 hue 로 갈고, 채도·명도를 비율로 조정한다."""
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3:]
    H, S, V = hsv_of(rgb)
    H2 = np.where(mask, hue, H)
    S2 = np.where(mask, np.clip(S * sat_scale, 0, 1), S)
    V2 = np.where(mask, np.clip(V + val_lift * (1 - V), 0, 1), V)
    out = np.concatenate([hsv_to_rgb(H2, S2, V2), alpha], -1)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


# 하트초는 heart_colors() 가 3색을 만들어 등록한다. main() 은 손대지 않는다.


def main():
    """decos/ 의 초를 게임에서 쓸 형태로 마감한다 — 하트초 3색 + 생일초 진한 버전."""
    heart_colors()
    deep_candles()





# ── 맛/색 변형 대량 생성 ─────────────────────────────────────────────
# ingredients.js 의 COLORS 와 id·hex 가 일치해야 한다. 어긋나면 프론트가 없는 파일을 찾는다.
COLORS = {
    "vanilla": "#fff2cc", "strawberry": "#ffd1dc", "cherry": "#e63950",
    "lemon": "#fff27a", "chocolate": "#8b5a2b", "tomato": "#ff6b57",
    "blueberry": "#6a7bd8", "avocado": "#a3c585", "peach": "#ffcab0",
    "banana": "#ffe08a", "protein": "#d9c7a8",
}


def multiply(path, hexcolor, mask=None):
    """밝은 면에 색을 입힌다 — RGB × (tint/255).

    하트초(빨강)와 달리 아이싱·생크림은 거의 흰색이라 곱하기가 정답이다:
    흰색→틴트색, 크림색→진한 틴트, 검은 선→검정 유지. HSV 로 색상만 갈면
    초콜릿처럼 어두운 색이 안 나온다(명도를 보존하므로).
    """
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).astype(np.float32)
    t = np.array([int(hexcolor[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255.0
    rgb = a[..., :3] * t
    if mask is not None:
        rgb = np.where(mask[..., None], rgb, a[..., :3])
    return Image.fromarray(np.concatenate([rgb, a[..., 3:]], -1).clip(0, 255).astype(np.uint8))


def multiply_rgb(path, factor, mask=None):
    """multiply 의 계수 직접 지정판 (틴트 × 톤보정)."""
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).astype(np.float32)
    rgb = a[..., :3] * factor
    if mask is not None:
        rgb = np.where(mask[..., None], rgb, a[..., :3])
    return Image.fromarray(np.concatenate([rgb, a[..., 3:]], -1).clip(0, 255).astype(np.uint8))


def icing_mask(path, geo):
    """맛/색이 바뀌는 부분 = **윗면 크림층(아이싱 + 드립)만**. 옆면 시트·접시는 안 건드린다.

    색으로는 못 가른다 — 텍스처를 뭉갠 면 평균색이 위아래 똑같다(hue 33~41, S 0.10~0.12).
    채도·노랑밀도도 안 된다: 옆면 오커 획이 오히려 윗면보다 진하다.
    구분선은 그려진 물결선 하나뿐이므로, **그 선을 벽 삼아 윗면 한가운데에서 채워 내려간다.**
    선이 막아주므로 경계가 정확히 그림대로 나오고, 영역을 통째로 칠하니 얼룩이 안 생긴다.
    (임계를 3~6 으로 바꿔도 결과가 59.1~59.5% 로 고정 — 선이 확실히 닫혀 있다는 뜻)
    """
    a = np.asarray(Image.open(path).convert("RGBA")).astype(np.float32)
    alpha = a[..., 3] > 8
    h, w = alpha.shape
    L = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    Lm = ndi.median_filter(np.where(alpha, L, 255), 5)      # 연필 결 제거
    ridge = ndi.binary_closing((Lm < ndi.gaussian_filter(Lm, 10) - 4) & alpha,
                               np.ones((3, 3)))             # 그려진 선 = 국소 어두움

    e = geo["top_ellipse"]
    seed = (int(e["cy"] * h - 0.6 * e["ry"] * h), int(e["cx"] * w))   # 윗면 한가운데
    lab, n = ndi.label(alpha & ~ridge)
    lid = lab[seed]
    if not lid:
        raise SystemExit("아이싱 시드가 선 위에 찍혔다 — geometry.json 의 타원을 확인할 것")
    return ndi.binary_fill_holes(lab == lid)


def lighten(rgb, k, sat=1.0):
    """흰색 쪽으로 k 만큼 당긴다 (0 = 그대로, 1 = 흰색).

    흰색과 섞으면 밝아지는 대신 채도가 같이 죽는다. sat>1 이면 밝기는 그대로 두고
    채도만 되살려 '연한데 색은 살아있는' 버전을 만든다.
    """
    out = rgb + (255.0 - rgb) * k
    if sat != 1.0:
        mx, mn = out.max(), out.min()
        if mx > mn:
            out = np.clip(mx - (mx - out) * sat, 0, 255)
    return out


def tint_cream(path, hexc, light=0.0, outline=0.62, sat=1.0):
    """생크림 틴트 — 면과 윤곽선을 따로 칠한다.

    통째로 곱하면 금색 윤곽선이 틴트와 섞여 탁해진다(금색 × 파랑 = 어두운 올리브).
    면(거의 흰색)은 맛 색으로, 윤곽선(금색)은 그 색의 어두운 버전으로 각각 맞춘다.
    경계는 채도로 부드럽게 섞어 계단이 안 생기게 한다.
    """
    a = np.asarray(Image.open(path).convert("RGBA")).astype(np.float32)
    alpha = a[..., 3] > 8
    H, S, V = hsv_of(a[..., :3])
    base_fill = a[..., :3][alpha & (S <= 0.12)].mean(0)
    base_out = a[..., :3][alpha & (S >= 0.28)].mean(0)

    target = lighten(np.array([int(hexc[i:i + 2], 16) for i in (1, 3, 5)], np.float32), light, sat)
    f_fill = target / np.maximum(base_fill, 1e-6)
    f_out = (target * outline) / np.maximum(base_out, 1e-6)

    t = np.clip((S - 0.10) / 0.20, 0, 1)[..., None]      # 0 = 면, 1 = 윤곽선
    rgb = a[..., :3] * (f_fill * (1 - t) + f_out * t)
    return Image.fromarray(np.concatenate([rgb, a[..., 3:]], -1).clip(0, 255).astype(np.uint8))


FLAME_HUE = (28, 62)          # 불꽃·심지의 노랑 대역 (실측 43~48)


def deepen(path, sat=1.55, val=0.90, min_sat=0.08, flame_lift=0.35):
    """색이 있는 부분만 채도를 올리고 살짝 어둡게 — 초의 '진한' 버전.

    무채색(줄무늬 흰 부분, 폭탄 검정, 대)은 min_sat 아래라 안 건드린다.
    명도를 조금 낮춰야 채도만 올렸을 때의 형광 느낌이 안 난다.

    ⚠ **불꽃은 어둡게 하면 안 된다.** 통째로 적용하면 노란 불꽃까지 칙칙해진다.
      노랑 대역은 어둡게 하는 대신 오히려 밝게 올린다.
    """
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).astype(np.float32)
    H, S, V = hsv_of(a[..., :3])
    flame = (H >= FLAME_HUE[0]) & (H <= FLAME_HUE[1])
    body = (S > min_sat) & ~flame

    S2 = np.where(body, np.clip(S * sat, 0, 1), S)
    V2 = np.where(body, np.clip(V * val, 0, 1), V)
    V2 = np.where(flame, np.clip(V2 + (1 - V2) * flame_lift, 0, 1), V2)
    rgb = hsv_to_rgb(H, S2, V2)
    return Image.fromarray(np.concatenate([rgb, a[..., 3:]], -1).clip(0, 255).astype(np.uint8))


# 하트초 색 후보 — (id, 라벨, 색상(도), 채도배율, 명도올림)
# 원본이 빨간 하트라 곱하기로는 색이 안 바뀐다(빨강 × 파랑 = 어두운 회색).
# 색상은 갈아끼우고 명도는 보존해야 연필 결이 산다.
# 게임에서 유저가 고르는 3색 (2026-08-01 결정)
HEART_COLORS = [
    ("red",  "빨강", 358, 1.00, 0.00),
    ("pink", "핑크", 345, 0.55, 0.20),
    ("blue", "파랑", 215, 0.70, 0.10),
]


def heart_colors():
    """하트초를 3색으로. 불꽃(노랑)·심지(갈색)·대(흰색)는 안 건드린다.

    곱하기로는 색이 안 바뀐다 — 원본이 채도 높은 빨강이라 파랑을 곱하면 어두운 회색이 된다.
    색상을 갈아끼우고 명도는 보존해야 연필 결이 산다.
    항상 원본 빨강에서 새로 만들므로 몇 번을 돌려도 결과가 같다.
    """
    import json
    d = BUILD / "decos"
    src = d / "heart_candle.png"
    decos = json.loads((BUILD / "decos.json").read_text(encoding="utf-8"))
    a = np.asarray(Image.open(src).convert("RGBA")).astype(np.float32)[..., :3]
    m = hue_mask(a, 340, 20)
    base = decos["heart_candle"]
    for cid, _, hue, sat, lift in HEART_COLORS:
        key = f"heart_candle_{cid}"
        retint(src, m, hue, sat, lift).save(d / f"{key}.png")
        decos[key] = dict(base, file=f"decos/{key}.png", source="decos/heart_candle.png",
                          tint={"hue": hue, "sat_scale": sat, "val_lift": lift})
    decos.pop("heart_candle", None)              # 원본은 소스일 뿐, 게임에는 3색만
    (BUILD / "decos.json").write_text(json.dumps(decos, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  하트초 {len(HEART_COLORS)}색 → {d}")


def deep_candles():
    import json
    d = BUILD / "decos"
    decos = json.loads((BUILD / "decos.json").read_text(encoding="utf-8"))
    for c in ("birthday_candle", "bomb_candle"):
        deepen(BUILD / decos[c]["file"]).save(d / f"{c}_deep.png")
    # 생일초는 진한 버전으로 확정 (사용자 선택)
    decos["birthday_candle"] = dict(decos["birthday_candle"],
                                    file="decos/birthday_candle_deep.png",
                                    source="decos/birthday_candle.png",
                                    tint={"deepen": True})
    (BUILD / "decos.json").write_text(json.dumps(decos, ensure_ascii=False, indent=1),
                                      encoding="utf-8")
    print("  생일초는 진한 버전(불꽃은 밝게)으로 확정 · 폭탄초는 기본 → " + str(d))


def mean_color(path, mask=None):
    """면 평균색 — 알파(및 마스크) 안쪽만."""
    a = np.asarray(Image.open(path).convert("RGBA")).astype(np.float32)
    sel = a[..., 3] > 8
    if mask is not None:
        sel = sel & mask
    return a[..., :3][sel].mean(0)


def variants(mode="pure", out_name="variants", light=0.58, sat=1.7):
    """맛/색 변형 생성.

    아이싱 바탕은 옅은 노랑, 생크림은 거의 흰색이라 같은 hex 를 곱해도 결과가 다르다.
    같은 맛인데 미묘하게 어긋난 두 색은 오히려 지저분해 보이므로, 기본값은
    아이싱을 생크림 톤으로 정규화한 뒤 틴트해서 **두 색을 똑같이** 맞춘다.

      as-is       : 아이싱 원래 색 × 틴트 (탁함)
      match-cream : 아이싱을 생크림 톤으로 맞춘 뒤 틴트  ← 기본
      pure        : 아이싱을 흰색으로 맞춘 뒤 틴트 (가장 선명)
    """
    import json
    base = BUILD / "base.png"
    cream = BUILD / "cream.png"
    out = BUILD / out_name
    out.mkdir(exist_ok=True)
    geo = json.loads((BUILD / "geometry.json").read_text(encoding="utf-8"))["base"]
    m = icing_mask(base, geo)

    if mode == "as-is":
        adj = np.ones(3, np.float32)
    else:
        target = np.array([255.0, 255.0, 255.0]) if mode == "pure" else mean_color(cream)
        adj = target / np.maximum(mean_color(base, m), 1e-6)

    for cid, hexc in COLORS.items():
        rgb = np.array([int(hexc[i:i + 2], 16) for i in (1, 3, 5)], np.float32)
        multiply_rgb(base, lighten(rgb, light, sat) / 255.0 * adj, m).save(out / f"cake_{cid}.png")
        tint_cream(cream, hexc, light=light, sat=sat).save(out / f"cream_{cid}.png")
    print(f"  [{mode} light={light} sat={sat}] {len(COLORS)}색 × 2종 → {out}")


if __name__ == "__main__":
    main()
