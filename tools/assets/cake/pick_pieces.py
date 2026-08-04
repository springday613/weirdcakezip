"""시안 그림에서 딸기 1개 · 생크림 1개를 떼고, 원본 배치를 좌표로 남긴다.

케이크마다 토핑을 전부 분리하지 않는다. 가장 온전한 것 하나씩만 스프라이트로 쓰고,
올릴 때는 원본의 배치(위치·크기·기울기)를 참고한다 — 그 배치를 layout.json 으로 뽑는다.

    python3 pick_pieces.py               # 기본: 시안1(금색 연필)
    python3 pick_pieces.py 그림.png

좌표계: base.png 캔버스 기준 0~1 정규화. 프론트는 base 를 깔고 그 위에
        left = x*W, top = y*H (중심 기준), 크기 = r*W, 회전 = deg 로 스프라이트를 얹으면 된다.
"""

import json
import sys
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.measure import regionprops
from skimage.segmentation import watershed

from split_cake_parts import HERE, segment, rgba, slug_of

OUT = HERE / "pieces"
TARGET = "tmp_strawberry_cake_시안1.png"


def split_touching(mask):
    """맞닿아 있는 둥근 덩이들을 거리변환 + watershed 로 쪼갠다.

    분리 간격은 거리변환 최댓값(= 덩이 하나의 내접반지름)에서 잡는다.
    연결성분 수로 추정하면 전부 붙어 있을 때 간격이 터무니없이 커진다.
    """
    from skimage.feature import peak_local_max
    d = ndi.distance_transform_edt(mask)
    min_distance = max(16, int(d.max() * 0.7))
    peaks = np.zeros_like(mask, bool)
    peaks[tuple(peak_local_max(d, min_distance=min_distance,
                               labels=mask, exclude_border=False).T)] = True
    markers, _ = ndi.label(peaks)
    return watershed(-d, markers, mask=mask)


def full_size(areas):
    """'온전한 덩이 한 개'의 기준 면적.

    단순 중앙값은 못 쓴다 — 윤곽이 끊겨 생긴 파편이 절반쯤 섞여 있어 중앙값이
    파편 쪽으로 끌려간다(생크림 실측: 풀 덩이 6200~7300 vs 파편 1400~3600).
    그래서 중앙값 이상인 것들의 중앙값을 기준으로 삼는다.
    """
    areas = np.asarray(areas, float)
    upper = areas[areas >= np.median(areas)]
    return float(np.median(upper))


def pieces(mask, shape):
    lab = split_touching(mask)
    props = [p for p in regionprops(lab) if p.area > 400]
    if not props:
        return lab, [], None
    h, w = shape

    def clipped(p):
        y0, x0, y1, x1 = p.bbox
        return y0 <= 2 or x0 <= 2 or y1 >= h - 2 or x1 >= w - 2

    ref = full_size([p.area for p in props])
    cand = [p for p in props
            if 0.72 * ref <= p.area <= 1.40 * ref and not clipped(p)]
    if not cand:
        cand = [p for p in props if not clipped(p)]
    best = max(cand, key=lambda p: p.solidity) if cand else None
    return lab, props, best


def sprite(a, lab, prop, pad=14):
    """고른 덩이만 잘라 투명 배경 스프라이트로. 자기 외곽선까지 살짝 포함."""
    m = lab == prop.label
    m = ndi.binary_dilation(m, np.ones((5, 5))) & ~(ndi.binary_dilation(lab > 0, np.ones((1, 1))) & (lab > 0) & ~m)
    ys, xs = np.where(m)
    y = slice(max(0, ys.min() - pad), min(a.shape[0], ys.max() + pad + 1))
    x = slice(max(0, xs.min() - pad), min(a.shape[1], xs.max() + pad + 1))
    return rgba(a[y, x], m[y, x])


def layout(props, shape):
    """각 인스턴스의 중심·기울기를 정규화해 기록.

    윤곽이 끊겨 한 덩이가 여러 조각으로 잡히면 조각마다 중심이 생겨 배치가 틀어진다.
    그래서 덩이 지름의 0.75 배 안에 있는 조각들은 하나로 묶고, 면적 가중 평균을 중심으로 쓴다.
    """
    h, w = shape
    ref = full_size([p.area for p in props])
    reach = 0.75 * 2 * np.sqrt(ref / np.pi)

    groups = []                                   # [(총면적, cy, cx, 대표 prop)]
    for p in sorted(props, key=lambda p: -p.area):
        cy, cx = p.centroid
        for g in groups:
            if np.hypot(cy - g["cy"], cx - g["cx"]) < reach:
                tot = g["area"] + p.area
                g["cy"] = (g["cy"] * g["area"] + cy * p.area) / tot
                g["cx"] = (g["cx"] * g["area"] + cx * p.area) / tot
                g["area"] = tot
                break
        else:
            groups.append({"area": float(p.area), "cy": cy, "cx": cx, "rep": p})

    items = []
    for g in sorted(groups, key=lambda g: (g["cy"], g["cx"])):
        if g["area"] < 0.35 * ref:                # 노이즈 조각 제외
            continue
        items.append({
            "x": round(g["cx"] / w, 4),
            "y": round(g["cy"] / h, 4),
            "deg": round(float(-np.degrees(g["rep"].orientation)), 1),
        })
    return items


def main(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    m = segment(a)
    shape = a.shape[:2]
    OUT.mkdir(exist_ok=True)
    stem = slug_of(path)

    b_lab, b_props, b_best = pieces(m["berry"], shape)
    c_lab, c_props, c_best = pieces(m["cream"], shape)

    report = {"source": unicodedata.normalize("NFC", Path(path).name),
              "canvas": {"w": shape[1], "h": shape[0]},
              "base": f"{stem}_base.png"}

    for tag, a_lab, props, best in (("strawberry", b_lab, b_props, b_best),
                                    ("cream", c_lab, c_props, c_best)):
        if best is None:
            print(f"  ! {tag}: 온전한 덩이를 못 찾음")
            continue
        spr = sprite(a, a_lab, best)
        spr.save(OUT / f"{stem}_{tag}.png")
        place = layout(props, shape)
        report[tag] = {
            "sprite": f"{stem}_{tag}.png",
            # 스프라이트 하나를 모든 자리에 쓰므로 크기는 전역 하나. 캔버스 폭 대비 비율.
            "size": round(spr.size[0] / shape[1], 4),
            # 스프라이트 자신의 각도 — 배치 회전은 (place.deg - sprite_deg) 상대값으로 쓴다
            "sprite_deg": round(float(-np.degrees(best.orientation)), 1),
            "picked_area": int(best.area),
            "picked_solidity": round(float(best.solidity), 3),
            "detected": len(props),
            "place": place,
        }
        print(f"  {tag:11s} 조각 {len(props):>3}개 → 배치 {len(place):>2}자리 | "
              f"선택 area={best.area} solidity={best.solidity:.3f} sprite={spr.size[0]}x{spr.size[1]}")

    (OUT / f"{stem}_layout.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    # QA: 쪼갠 결과와 고른 덩이 표시
    rng = np.random.default_rng(1)
    v = a.copy()
    for a_lab, best, base_col in ((b_lab, b_best, (255, 90, 90)), (c_lab, c_best, (90, 200, 255))):
        n = int(a_lab.max())
        if not n:
            continue
        cols = rng.integers(60, 240, size=(n + 1, 3)); cols[0] = 0
        sel = a_lab > 0
        v[sel] = v[sel] * 0.45 + cols[a_lab[sel]] * 0.55
        if best is not None:
            edge = ndi.binary_dilation(a_lab == best.label, np.ones((9, 9))) & ~(a_lab == best.label)
            v[edge] = base_col
    Image.fromarray(v.clip(0, 255).astype(np.uint8)).save(OUT / f"{stem}_pick_qa.png")
    print(f"\n→ {OUT}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args:
        target = Path(args[0])
    else:
        real = {unicodedata.normalize("NFC", p.name): p for p in HERE.iterdir()}
        target = real[TARGET]
    print(unicodedata.normalize("NFC", target.name))
    main(target)
