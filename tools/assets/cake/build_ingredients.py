"""시트 재료·보울 시트 → 개별 스프라이트.

토핑과 달리 배치 계산이 없다. 게임 재료 id 와 파일명만 맞추면 된다 —
프론트가 `/assets/ing_<id>.png` 로 찾는다(IngredientPalette.jsx).

이름은 ingredients.js 의 SHEET_BASE 10종과 1:1 이다:
  flour · milk · egg · butter · water · soymilk · riceflour · veggieoil · icecream · gelatin

    python3 build_ingredients.py

출력: build/ingredients/*.png
"""

import json
import unicodedata

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

from split_cake_parts import hsv, rgba, HERE

OUT = HERE / "build" / "ingredients"
MIN_AREA = 3000

# 시트별 개체 순서 = 왼쪽 → 오른쪽
SHEETS = {
    "dough_ingredients_3.PNG": ["flour", "milk", "egg", "butter", "water"],
    "dough_ingredients_2.jpg": ["soymilk", "riceflour", "veggieoil", "gelatin"],
    "dough_ingredients_1.png": ["icecream"],
    "bowl_full.jpg": ["bowl_dough"],
    "bowl_empty.jpg": ["bowl_empty"],
}
SHEET_BASE = ["flour", "milk", "egg", "butter", "water",
              "soymilk", "riceflour", "veggieoil", "icecream", "gelatin"]

# 반죽 주무르기 컷 — v2 는 흰 배경에 진한 갈색 외곽선이라 규칙이 단순하다.
# (v1 은 배경이 웜톤 핑크였고 발과 발 사이 배경이 같은 크림색이라 영역 분할이 필요했다)
KNEAD_SRC = "dough_ing_v2.PNG"


def objects(path):
    """배경(핑크 또는 크림)을 벗기고 왼쪽부터 개체를 잘라낸다.

    jpg 는 압축 링잉이 배경에 미세하게 남는다 → 닫기 연산 뒤 작은 조각을 버린다.
    """
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
        out.append(rgba(a[y, x], m[y, x]))
    return out


def knead(path):
    """반죽 + 발만 남기고 흰 배경을 지운다.

    배경은 순백(S=0)이고 발은 크림색(S≈0.14)이라 채도로 갈린다.
    테두리와 이어진 흰색만 배경으로 보므로, 발 안쪽 밝은 부분은 살아남는다.
    """
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    H, S, V = hsv(a)
    white = (S < 0.045) & (V > 0.93)
    lab, _ = ndi.label(white)
    edge = np.zeros_like(white)
    edge[0, :] = edge[-1, :] = edge[:, 0] = edge[:, -1] = True
    ids = np.unique(lab[edge & white])
    bg = np.isin(lab, ids[ids > 0])
    fg = ndi.binary_closing(~bg, np.ones((3, 3)), border_value=1)
    return a, ndi.binary_fill_holes(fg)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    real = {unicodedata.normalize("NFC", p.name): p for p in HERE.iterdir()}

    found = {}
    for sheet, names in SHEETS.items():
        objs = objects(real[sheet])
        if len(objs) != len(names):
            raise SystemExit(f"{sheet}: 개체 {len(objs)}개인데 이름은 {len(names)}개 — "
                             f"SHEETS 의 순서/개수를 확인할 것")
        for name, img in zip(names, objs):
            fname = f"ing_{name}.png" if name in SHEET_BASE else f"{name}.png"
            img.save(OUT / fname)
            found[name] = {"file": f"ingredients/{fname}",
                           "w": img.size[0], "h": img.size[1], "sheet": sheet}

    # 반죽 주무르기 컷
    a, fg = knead(real[KNEAD_SRC])
    ys, xs = np.where(fg)
    y = slice(max(0, ys.min() - 6), min(a.shape[0], ys.max() + 7))
    x = slice(max(0, xs.min() - 6), min(a.shape[1], xs.max() + 7))
    img = rgba(a[y, x], fg[y, x])
    img.save(OUT / "dough_knead.png")
    found["dough_knead"] = {"file": "ingredients/dough_knead.png",
                            "w": img.size[0], "h": img.size[1], "sheet": KNEAD_SRC}
    qa = a.copy(); qa[~fg] = (0, 180, 255)
    Image.fromarray(qa.clip(0, 255).astype(np.uint8)).save(OUT / "dough_knead_qa.png")

    missing = [x for x in SHEET_BASE if x not in found]
    (HERE / "build" / "ingredients.json").write_text(
        json.dumps({"ingredients": found, "missing": missing}, ensure_ascii=False, indent=1),
        encoding="utf-8")

    for name in SHEET_BASE:
        v = found[name]
        print(f"  {name:11s} → {v['file']:34s} {v['w']}x{v['h']}")
    for name in ("bowl_dough", "bowl_empty", "dough_knead"):
        v = found[name]
        print(f"  {name:11s} → {v['file']:34s} {v['w']}x{v['h']}")
    print(f"\n  SHEET_BASE 10종 {'전부 확보' if not missing else '누락: ' + ', '.join(missing)}")
    print(f"→ {OUT}")


if __name__ == "__main__":
    main()
