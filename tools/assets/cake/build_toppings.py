"""토핑 시트 → 개별 스프라이트 + 상대 크기표.

한 장에 나란히 그렸으므로 시트 안의 픽셀 폭이 곧 '의도한 상대 크기'다.
그 비율을 유지한 채, 이미 눈으로 확정한 딸기 크기(0.095)에 맞춰 전체를 앵커링한다.
→ 블루베리는 작고 닭가슴살은 크게, 알아서 따라온다.

    python3 build_toppings.py

출력: build/toppings/<id>.png · build/toppings.json
"""

import json
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

from split_cake_parts import hsv, rgba, HERE

OUT = HERE / "build" / "toppings"

# 시트별 개체 순서 = 왼쪽 → 오른쪽. ingredients.js 의 TOPPINGS id 와 맞춘다.
SHEETS = {
    "toppings_1.png": ["strawberry", "blueberry", "banana", "lemon", "peach", "cherry"],
    "toppings_2.png": ["chocolate", "tomato", "almond", "chicken", "avocado"],
}
# 시트 비율에서 뽑은 크기를 눈으로 보고 조정한 값 (compose.html 에서 확정)
OVERRIDES = {"strawberry": 0.078, "chocolate": 0.103, "tomato": 0.083}

ANCHOR_ID = "strawberry"      # 이미 확정한 크기의 기준
ANCHOR_SIZE = 0.095           # compose.html 에서 정한 딸기 크기 (캔버스 폭 대비)
MIN_AREA = 2000


def objects(path):
    """배경 핑크를 벗기고 왼쪽부터 개체를 잘라낸다."""
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    H, S, V = hsv(a)
    warm = a[..., 1] - a[..., 2]
    L = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    fg = ndi.binary_closing((warm > 2) | (L < 205) | (S > 0.25), np.ones((5, 5)))
    lab, n = ndi.label(fg)
    sizes = ndi.sum(fg, lab, range(1, n + 1))
    slices = ndi.find_objects(lab)
    ids = sorted((i + 1 for i, s in enumerate(sizes) if s > MIN_AREA),
                 key=lambda i: slices[i - 1][1].start)
    out = []
    for i in ids:
        m = ndi.binary_fill_holes(lab == i)
        ys, xs = np.where(m)
        pad = 6
        y = slice(max(0, ys.min() - pad), min(a.shape[0], ys.max() + pad + 1))
        x = slice(max(0, xs.min() - pad), min(a.shape[1], xs.max() + pad + 1))
        out.append((rgba(a[y, x], m[y, x]),
                    int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)))
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    real = {unicodedata.normalize("NFC", p.name): p for p in HERE.iterdir()}

    found = {}
    for sheet, names in SHEETS.items():
        objs = objects(real[sheet])
        if len(objs) != len(names):
            raise SystemExit(f"{sheet}: 개체 {len(objs)}개인데 이름은 {len(names)}개 — "
                             f"SHEETS 의 순서/개수를 확인할 것")
        for name, (img, w, h) in zip(names, objs):
            img.save(OUT / f"{name}.png")
            found[name] = dict(file=f"toppings/{name}.png", px_w=w, px_h=h,
                               sprite_w=img.size[0], sprite_h=img.size[1], sheet=sheet)

    k = ANCHOR_SIZE / found[ANCHOR_ID]["px_w"]     # 시트 픽셀 → 캔버스 비율
    for name, v in found.items():
        v["size_from_sheet"] = round(v["px_w"] * k, 4)
        v["size"] = OVERRIDES.get(name, v["size_from_sheet"])

    # protein(프로틴파우더)는 그리지 않고 빼기로 함 (2026-07-31 결정)
    dropped = ["protein"]
    expected = ["strawberry", "cherry", "lemon", "chocolate", "tomato", "blueberry",
                "avocado", "peach", "banana", "almond", "chicken"]
    missing = [t for t in expected if t not in found]

    report = {"anchor": {"id": ANCHOR_ID, "size": ANCHOR_SIZE},
              "toppings": found, "missing": missing, "dropped": dropped}
    (HERE / "build" / "toppings.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")

    for name in expected:
        if name in found:
            v = found[name]
            mark = "  ← 조정" if name in OVERRIDES else ""
            print(f"  {name:11s} 시트 {v['px_w']:>3}x{v['px_h']:<3} → size {v['size']:.4f}"
                  f"{mark}")
    if missing:
        print(f"\n  ! 아직 없는 토핑: {', '.join(missing)}")
    print(f"  (제외: {', '.join(dropped)} — 안 만들기로 함)")
    print(f"\n→ {OUT}")
    return report


if __name__ == "__main__":
    main()
