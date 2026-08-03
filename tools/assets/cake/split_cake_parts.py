"""완제품 케이크 그림 → 케이크베이스 / 딸기 / 생크림 3분리.

케이크와 토핑을 따로 그리면 스케일이 안 맞으므로, 완제품을 먼저 합쳐 그린 뒤
여기서 부위별로 분리한다. 원본 그림이 바뀌면 이 스크립트를 다시 돌린다.

    python3 split_cake_parts.py                 # assets/ 안의 딸기케이크 시안 3종
    python3 split_cake_parts.py 그림.png ...     # 임의 파일

분리 근거 (세 시안 공통으로 성립하는 것만 씀):
  - 배경    : 배경 핑크는 B>G, 케이크 크림은 G>B  → warm = G-B 부호로 갈린다
  - 딸기    : hue 0-25도 고채도(과육) + 55-160도(꼭지). 색만으로 충분히 분리된다
  - 생크림  : 크림 덩이와 옆면은 색이 사실상 같다. 대신 셋 다 "닫힌 윤곽선을 가진
              중간 크기의 둥근 덩이" 라는 구조가 공통 → 국소 어두움(외곽선)으로
              영역을 쪼갠 뒤 크기·형태로 고른다. 채도 임계(Otsu 포함)는 시안마다
              흔들려서 못 쓴다.
"""

import sys
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

# 스크립트는 리포 안(tools/assets/cake), 원본 그림·빌드 산출물은 리포 밖 assets/assets-cake (S17)
REPO = Path(__file__).resolve().parents[3]            # cake-shop/
HERE = REPO.parent / "assets" / "assets-cake"         # 원본 그림 + build/ 산출물
OUT = HERE / "split"

DEFAULT = [
    "tmp_strawberry_cake.png",
    "tmp_strawberry_cake_시안1.png",
    "tmp_strawberry_cake_시안2.png",
]

# 출력 파일명은 ASCII 로 — 한글 파일명은 macOS(NFD) 와 브라우저(NFC) 가 어긋나 링크가 깨진다
SLUG = {
    "tmp_strawberry_cake": "flat",
    "tmp_strawberry_cake_시안1": "pencil1",
    "tmp_strawberry_cake_시안2": "pencil2",
}


def slug_of(path):
    stem = unicodedata.normalize("NFC", Path(path).stem)
    if stem in SLUG:
        return SLUG[stem]
    ascii_stem = "".join(c if c.isascii() and (c.isalnum() or c in "-_") else "-" for c in stem)
    return ascii_stem.strip("-") or "asset"

# 크림 덩이 판정 (전경 면적 대비 비율이라 그림 해상도가 바뀌어도 따라간다)
DOLLOP_MIN_FRAC = 0.0012
DOLLOP_MAX_FRAC = 0.030
DOLLOP_MIN_FILL = 0.42   # 면적 / 바운딩박스 면적 — 접시 테두리 같은 가는 호를 걸러낸다
DOLLOP_MAX_ASPECT = 2.2


def hsv(a):
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


def biggest(m):
    lab, n = ndi.label(m)
    if not n:
        return m
    return lab == int(np.argmax(ndi.sum(m, lab, range(1, n + 1)))) + 1


def segment(a):
    H, S, V = hsv(a)
    warm = a[..., 1] - a[..., 2]
    L = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]

    # 1) 전경 = 배경 핑크가 아닌 것 중 가장 큰 덩어리
    fg = (warm > 2) | (L < 205) | (S > 0.25)
    fg = ndi.binary_fill_holes(biggest(ndi.binary_closing(fg, np.ones((5, 5)))))

    # 2) 딸기 = 붉은 과육 + 초록 꼭지
    red = ((H < 25) | (H > 345)) & (S > 0.35)
    leaf = (H > 55) & (H < 160) & (S > 0.25)
    berry = ndi.binary_fill_holes(ndi.binary_closing((red | leaf) & fg, np.ones((7, 7))))
    lab, n = ndi.label(berry)
    if n:
        sizes = ndi.sum(berry, lab, range(1, n + 1))
        berry = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v > fg.sum() * 0.002])
    berry = ndi.binary_dilation(berry, np.ones((5, 5)))   # 외곽선 흡수

    # 3) 국소 어두움 = 외곽선 (검은 라인이든 연필 선이든 동일하게 잡힌다)
    dark = (L < ndi.gaussian_filter(L, 12) - 2.0) & fg
    dark = ndi.binary_closing(dark, np.ones((3, 3)))

    # 4) 외곽선으로 쪼갠 영역 중 크기·형태가 맞는 밝은 덩이 = 크림
    reg = ndi.binary_opening(fg & ~dark & ~berry, np.ones((3, 3)))
    cream, picked = pick_dollops(reg, fg, V, berry)

    # 5) 보강 — 윤곽이 끊겨 위에서 놓친 덩이는 "노란 아이싱 영역의 구멍" 으로 줍는다
    icing = biggest(ndi.binary_closing((H >= 36) & (H <= 62) & (S > 0.13) & fg & ~berry,
                                       np.ones((9, 9))))
    holes = ndi.binary_opening(ndi.binary_fill_holes(icing) & ~icing & ~berry & ~cream,
                               np.ones((5, 5)))
    extra, more = pick_dollops(holes, fg, V, berry)
    cream |= extra
    picked += more

    cream = ndi.binary_fill_holes(ndi.binary_dilation(cream, np.ones((5, 5))))
    base = fg & ~berry & ~cream
    return dict(fg=fg, berry=berry, cream=cream, base=base, dark=dark, dollops=picked)


def pick_dollops(reg, fg, V, berry):
    """영역 라벨 중 크기·형태·밝기·위치가 크림 덩이다운 것만 고른다."""
    lab, n = ndi.label(reg)
    total = fg.sum()
    out = np.zeros_like(fg)
    picked = []
    if not n:
        return out, picked
    # 크림 덩이는 항상 윗면 테두리에 있다 → 케이크 상단 65% 안쪽만 후보
    rows = np.where(fg.any(1))[0]
    y_limit = rows[0] + 0.65 * (rows[-1] - rows[0])
    for i, sl in enumerate(ndi.find_objects(lab), start=1):
        if sl is None:
            continue
        m = lab[sl] == i
        area = int(m.sum())
        if not (total * DOLLOP_MIN_FRAC <= area <= total * DOLLOP_MAX_FRAC):
            continue
        hh = sl[0].stop - sl[0].start
        ww = sl[1].stop - sl[1].start
        if area / float(hh * ww) < DOLLOP_MIN_FILL:
            continue
        if max(hh / ww, ww / hh) > DOLLOP_MAX_ASPECT:
            continue
        if V[sl][m].mean() < 0.72:        # 어두운 얼룩 배제
            continue
        if (sl[0].start + sl[0].stop) / 2 > y_limit:   # 옆면·접시 오탐 배제
            continue
        out[sl] |= m
        picked.append(area)
    return out, picked


def soft(mask, blur=1.0):
    return np.clip(ndi.gaussian_filter(mask.astype(np.float32), blur), 0, 1)


def rgba(a, mask):
    return Image.fromarray(np.dstack([a, soft(mask) * 255]).clip(0, 255).astype(np.uint8))


def inpaint(a, fg, hole, dark, sigma=28.0):
    """토핑을 걷어낸 자리를 주변 '면' 색으로 메운다.

    최근접 픽셀을 그대로 쓰면 구멍 바로 옆의 외곽선(검정)을 물어와 얼룩이 진다.
    그래서 외곽선을 뺀 깨끗한 픽셀만 소스로 삼아 정규화 컨볼루션(가중 평균)으로
    부드러운 면 색을 만든 뒤 채운다.
    """
    src = (fg & ~hole & ~dark).astype(np.float32)
    num = np.dstack([ndi.gaussian_filter(a[..., c] * src, sigma) for c in range(3)])
    den = np.maximum(ndi.gaussian_filter(src, sigma), 1e-6)[..., None]
    fill = num / den
    w = soft(hole, 2.0)[..., None]
    return a * (1 - w) + fill * w


def process(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    m = segment(a)
    stem = slug_of(path)
    OUT.mkdir(exist_ok=True)
    Image.open(path).convert("RGB").save(OUT / f"{stem}_original.png")

    rgba(a, m["berry"]).save(OUT / f"{stem}_strawberry.png")
    rgba(a, m["cream"]).save(OUT / f"{stem}_cream.png")
    # 베이스 구멍은 조금 더 넓게 — 토핑 외곽선 잔상이 남지 않도록
    hole = ndi.binary_dilation(m["berry"] | m["cream"], np.ones((9, 9))) & m["fg"]
    rgba(inpaint(a, m["fg"], hole, m["dark"]), m["fg"]).save(OUT / f"{stem}_base.png")
    v = a.copy()
    v[~m["fg"]] = (0, 180, 255)
    v[m["cream"]] = v[m["cream"]] * 0.35 + np.array([0, 200, 80]) * 0.65
    v[m["berry"]] = v[m["berry"]] * 0.35 + np.array([255, 0, 0]) * 0.65
    Image.fromarray(v.clip(0, 255).astype(np.uint8)).save(OUT / f"{stem}_qa.png")

    print(f"{stem:34s} fg={int(m['fg'].sum()):>7}  딸기={int(m['berry'].sum()):>7}  "
          f"생크림={int(m['cream'].sum()):>7} ({len(m['dollops'])}덩이)")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args:
        targets = [Path(x) for x in args]
    else:
        real = {unicodedata.normalize("NFC", p.name): p for p in HERE.iterdir()}
        targets = [real[n] for n in DEFAULT if n in real]
    for t in targets:
        process(t)
    print(f"\n→ {OUT}")
