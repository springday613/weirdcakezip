"""손그림 부품 → 게임 에셋 + 배치 기하.

입력 (직접 그린 것)
  cake_base.png                    토핑 없는 케이크 베이스 (아이싱 + 드립 + 접시)
  strawberry_cake_components1.png  부품 시트 — 시트 / 딸기 / 생크림 나란히

출력 (build/)
  base.png · strawberry.png · cream.png   누끼 뜬 스프라이트
  geometry.json                            베이스의 윗면 타원 + 캔버스 정보

부품 시트의 상대 크기는 '카탈로그'일 뿐 합성 비율이 아니다(사용자 확인).
실제 크기·개수는 compose.html 에서 슬라이더로 정한 뒤 layout.json 으로 굳힌다.
"""

import json
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

from split_cake_parts import hsv, biggest, rgba, HERE

OUT = HERE / "build"
BASE_SRC = "cake_base.png"

# 베이스를 전경에 딱 맞춰 자르면 링 뒤쪽 생크림·초가 캔버스 위로 삐져나가 잘린다.
# 위쪽에만 투명 여백을 준다 — 폭을 늘리면 캔버스 폭 기준인 size 값이 전부 어긋난다.
TOP_MARGIN = 240
PARTS_SRC = "strawberry_cake_components1.png"


def foreground(a):
    """배경 핑크 제거 — 배경은 B>G, 그림은 G>B."""
    H, S, V = hsv(a)
    warm = a[..., 1] - a[..., 2]
    L = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    fg = (warm > 2) | (L < 205) | (S > 0.25)
    return ndi.binary_closing(fg, np.ones((5, 5)))


def cut(a, mask, pad=6):
    ys, xs = np.where(mask)
    y = slice(max(0, ys.min() - pad), min(a.shape[0], ys.max() + pad + 1))
    x = slice(max(0, xs.min() - pad), min(a.shape[1], xs.max() + pad + 1))
    return rgba(a[y, x], mask[y, x]), (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))


def pad_top(img, px):
    out = Image.new("RGBA", (img.size[0], img.size[1] + px), (0, 0, 0, 0))
    out.paste(img, (0, px))
    return out


def load(name):
    real = {unicodedata.normalize("NFC", p.name): p for p in HERE.iterdir()}
    return np.asarray(Image.open(real[name]).convert("RGB")).astype(np.float32)


def top_ellipse(a, fg):
    """윗면 아이싱의 타원을 잡는다.

    아이싱(노란 영역)은 윗면 + 드립이다. 타원의 좌우 끝점 높이가 곧 타원 중심의 y 이고,
    거기서 꼭대기까지가 세로 반지름이다. 드립이 아래로 흘러도 좌우 끝은 흔들리지 않는다.
    """
    H, S, V = hsv(a)
    icing = biggest(ndi.binary_closing((H >= 36) & (H <= 62) & (S > 0.13) & fg, np.ones((9, 9))))
    ys, xs = np.where(icing)
    x0, x1 = int(xs.min()), int(xs.max())
    y_top = int(ys.min())

    def rim_y(col):                       # 그 열에서 아이싱이 시작되는(가장 위) y
        band = np.where(icing[:, col])[0]
        return int(band.min()) if band.size else None

    edge = max(3, (x1 - x0) // 60)
    left = [rim_y(c) for c in range(x0, x0 + edge) if rim_y(c) is not None]
    right = [rim_y(c) for c in range(x1 - edge, x1 + 1) if rim_y(c) is not None]
    y_mid = float(np.mean(left + right))

    cx = (x0 + x1) / 2.0
    rx = (x1 - x0) / 2.0
    ry = max(1.0, y_mid - y_top)
    return icing, dict(cx=cx, cy=y_mid, rx=rx, ry=ry,
                       bbox=[x0, y_top, x1, int(ys.max())])


def main():
    OUT.mkdir(exist_ok=True)
    report = {}

    # --- 베이스
    a = load(BASE_SRC)
    fg = ndi.binary_fill_holes(biggest(foreground(a)))
    icing, ell = top_ellipse(a, fg)
    img, box = cut(a, fg, pad=0)
    img = pad_top(img, TOP_MARGIN)
    img.save(OUT / "base.png")
    # 잘라낸 base.png 기준으로 좌표를 다시 잡는다 (위 여백만큼 원점이 올라간다)
    ox, oy = box[0], box[1] - TOP_MARGIN
    bw, bh = img.size
    report["base"] = {
        "file": "base.png", "w": bw, "h": bh,
        "cake_w": int(box[2] - box[0]), "cake_h": int(box[3] - box[1]),
        "top_margin": TOP_MARGIN,
        "top_ellipse": {                      # base.png 안에서의 0~1 정규화 좌표
            "cx": round((ell["cx"] - ox) / bw, 4),
            "cy": round((ell["cy"] - oy) / bh, 4),
            "rx": round(ell["rx"] / bw, 4),
            "ry": round(ell["ry"] / bh, 4),
        },
    }

    # --- 부품 시트: 왼쪽부터 시트 / 딸기 / 생크림
    a = load(PARTS_SRC)
    fg = foreground(a)
    lab, n = ndi.label(fg)
    sizes = ndi.sum(fg, lab, range(1, n + 1))
    ids = [i + 1 for i, s in enumerate(sizes) if s > 3000]
    ids.sort(key=lambda i: ndi.find_objects(lab)[i - 1][1].start)
    names = ["sheet", "strawberry", "cream"]
    for name, i in zip(names, ids):
        m = ndi.binary_fill_holes(lab == i)
        img, _ = cut(a, m)
        img.save(OUT / f"{name}.png")
        report[name] = {"file": f"{name}.png", "w": img.size[0], "h": img.size[1]}

    (OUT / "geometry.json").write_text(json.dumps(report, ensure_ascii=False, indent=2),
                                       encoding="utf-8")
    for k, v in report.items():
        print(f"  {k:11s} {v['file']:16s} {v['w']}x{v['h']}"
              + (f"  타원 {v['top_ellipse']}" if "top_ellipse" in v else ""))
    print(f"\n→ {OUT}")
    return report


if __name__ == "__main__":
    main()
