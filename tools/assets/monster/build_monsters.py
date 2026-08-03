"""몬스터 손그림 → 표정 3종 스프라이트(WebP).

케이크 쪽 build_ingredients.py 의 knead() 방식 그대로다 — 배경이 순백(253~254, S≈0)
이라 테두리에서 흰색을 flood-fill 하면 개체만 남는다. 색으로 영역을 가르지 않는다.

케이크와 다른 건 **종별 균일 캔버스**다. ResultScreen 은 점수에 따라 같은 자리에서
img[mood] 만 바꿔 끼우는데(.monster-big 160px, object-fit: contain), 컷마다 여백이
다르면 표정이 바뀔 때 캐릭터가 튀어 보인다. 그래서 종의 3컷을 모아
"본체 중심에서 가장 멀리 뻗은 거리"로 공통 캔버스를 잡고, 각 컷을 자기 본체 중심에
맞춰 그 캔버스로 잘라낸다. 반짝이·💢 같은 장식은 표정의 일부라 지우지 않고 살린다.

    python3 build_monsters.py [--install]

출력: build/<id>[_happy|_sad].webp   --install 이면 ../../cake-shop/public/assets/ 까지
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

# 스크립트는 리포 안(tools/assets/monster), 원본 그림은 리포 밖 assets/assets-monster (S17)
REPO = Path(__file__).resolve().parents[3]            # cake-shop/
HERE = REPO.parent / "assets" / "assets-monster"      # 원본 그림 + build/ 산출물
OUT = HERE / "build"
DEST = REPO / "public" / "assets"

SPECIES = ["cat", "marsh", "spike", "flame", "dust", "bean", "cherry", "pink"]
MOODS = ["", "_happy", "_sad"]

# 표정이 아직 normal 하나뿐인 종. 주문(order-002)을 맡았으니 게임에는 세우되,
# 세 표정이 같은 그림이라 점수가 표정에 안 드러난다 — 그림이 나오면 SPECIES 로 옮긴다.
# 어금니는 흑백 라인만 있어 아직 여기에도 못 들어간다.
SINGLE = ["robot"]

MAX_W = 720        # to_webp.py 와 같은 기준. 화면 최대 160px 이라 넉넉하다
QUALITY = 90
PAD = 24           # 캔버스 여백(원본 픽셀 기준)
MIN_AREA = 150     # 이보다 작은 조각은 스캔 노이즈로 보고 버린다


def cutout(path):
    """흰 배경을 벗긴다. → (RGB 배열, 전경 마스크)

    테두리와 이어진 흰색만 배경으로 본다. 고양이·마시멜로·체리처럼 몸이 흰
    캐릭터도 외곽선이 닫혀 있으면 안쪽은 살아남는다.
    """
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    mx, mn = a.max(2), a.min(2)
    S = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    white = (S < 0.06) & (mx / 255.0 > 0.96)

    lab, _ = ndi.label(white)
    edge = np.zeros_like(white)
    edge[0, :] = edge[-1, :] = edge[:, 0] = edge[:, -1] = True
    bg = np.isin(lab, [i for i in np.unique(lab[edge & white]) if i > 0])

    # border_value=1 — 기본값(0)은 가장자리를 깎는다
    fg = ndi.binary_fill_holes(ndi.binary_closing(~bg, np.ones((3, 3)), border_value=1))

    lab, n = ndi.label(fg)
    sizes = ndi.sum(fg, lab, range(1, n + 1))
    fg = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= MIN_AREA])
    return a, fg


def extents(fg):
    """(본체 중심, 본체 중심에서 전경 끝까지의 상/하/좌/우 거리)."""
    lab, n = ndi.label(fg)
    sizes = ndi.sum(fg, lab, range(1, n + 1))
    body = lab == (int(np.argmax(sizes)) + 1)
    bys, bxs = np.where(body)
    cy, cx = (bys.min() + bys.max()) / 2, (bxs.min() + bxs.max()) / 2
    ys, xs = np.where(fg)
    return (cy, cx), (cy - ys.min(), ys.max() - cy, cx - xs.min(), xs.max() - cx)


def crop(a, fg, center, box):
    """본체 중심을 캔버스 중심에 두고 잘라낸다. 원본 밖은 투명으로 채운다."""
    cy, cx = center
    t, b, l, r = box
    H, W = fg.shape
    h, w = int(t + b), int(l + r)
    y0, x0 = int(round(cy - t)), int(round(cx - l))

    out = np.zeros((h, w, 4), np.float32)
    sy = slice(max(0, y0), min(H, y0 + h))
    sx = slice(max(0, x0), min(W, x0 + w))
    dy = slice(sy.start - y0, sy.start - y0 + (sy.stop - sy.start))
    dx = slice(sx.start - x0, sx.start - x0 + (sx.stop - sx.start))
    out[dy, dx, :3] = a[sy, sx]
    out[dy, dx, 3] = np.clip(ndi.gaussian_filter(fg[sy, sx].astype(np.float32), 1.0), 0, 1) * 255
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


def main(install=False):
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for name in SPECIES:
        cuts = {}
        for mood in MOODS:
            src = HERE / f"{name}{mood}.png"
            if not src.exists():
                raise SystemExit(f"{src.name} 없음 — 종/표정 이름을 확인할 것")
            a, fg = cutout(src)
            cuts[mood] = (a, fg) + extents(fg)

        # 종의 3컷을 덮는 공통 캔버스
        box = tuple(max(c[3][i] for c in cuts.values()) + PAD for i in range(4))

        for mood, (a, fg, center, _) in cuts.items():
            img = crop(a, fg, center, box)
            if img.width > MAX_W:
                img = img.resize((MAX_W, round(MAX_W * img.height / img.width)), Image.LANCZOS)
            f = OUT / f"{name}{mood}.webp"
            img.save(f, "WEBP", quality=QUALITY, method=6)
            if install:
                DEST.mkdir(parents=True, exist_ok=True)
                img.save(DEST / f.name, "WEBP", quality=QUALITY, method=6)
            total += f.stat().st_size
        print(f"  {name:7s} {img.size[0]}x{img.size[1]}  ×3")

    for name in SINGLE:
        a, fg = cutout(HERE / f"{name}.png")
        center, ext = extents(fg)
        img = crop(a, fg, center, tuple(x + PAD for x in ext))
        if img.width > MAX_W:
            img = img.resize((MAX_W, round(MAX_W * img.height / img.width)), Image.LANCZOS)
        f = OUT / f"{name}.webp"
        img.save(f, "WEBP", quality=QUALITY, method=6)
        if install:
            img.save(DEST / f.name, "WEBP", quality=QUALITY, method=6)
        total += f.stat().st_size
        print(f"  {name:7s} {img.size[0]}x{img.size[1]}  ×1 (표정 대기)")

    print(f"\n  {len(SPECIES) * 3 + len(SINGLE)}컷  {total / 1024:.0f} KB → {OUT}"
          + (f"\n  설치: {DEST}" if install else ""))


if __name__ == "__main__":
    main(install="--install" in sys.argv)
