#!/usr/bin/env python3
"""손그림 PNG → 게임 에셋. 누끼(cutout) · 영역 틴팅(tint) · 크롭(crop) · 좌표 찾기(probe).

CSS filter/hue-rotate 는 크림색 저채도 그림에서 정확한 색이 안 나오고, mix-blend 는 흰 배경을
못 가린다. 그래서 flood-fill 로 영역을 분리하고 multiply 로 미리 생성한다.

  python3 asset_tool.py probe  in.png out.png                  # 격자 찍어 seed 좌표 찾기
  python3 asset_tool.py cutout in.png out.png
  python3 asset_tool.py tint   in.png outdir --seed 320,240 --name cake_{color}
  python3 asset_tool.py crop   in.png out.png --box 100,50,400,300
"""
import argparse, pathlib, sys

from PIL import Image, ImageDraw
import numpy as np

# src/data/ingredients.js 의 COLORS 와 id·hex 를 일치시킨다.
# 불일치하면 프론트가 <asset>_<colorid>.png 를 못 찾는다.
COLORS = {
    "vanilla": "#fff2cc",
    "strawberry": "#ffd1dc",
    "cherry": "#e63950",
    "lemon": "#fff27a",
    "chocolate": "#8b5a2b",
    "tomato": "#ff6b57",
    "blueberry": "#6a7bd8",
    "avocado": "#a3c585",
    "peach": "#ffcab0",
    "banana": "#ffe08a",
    "protein": "#d9c7a8",
}
SENT = (255, 0, 255)  # flood-fill 표식용 색 (그림에 없을 색)


def load_rgb(path):
    im = Image.open(path)
    return im.convert("RGB"), (im.convert("RGBA").split()[3] if im.mode in ("RGBA", "LA") else None)


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def cutout(src, dst, thresh=30):
    """네 모서리에서 flood-fill — '바깥과 연결된 흰색'만 투명하게. 안쪽 흰색은 검은 라인에 막혀 보존된다."""
    rgb, alpha0 = load_rgb(src)
    w, h = rgb.size
    for corner in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        ImageDraw.floodfill(rgb, corner, SENT, thresh=thresh)
    a = np.array(rgb)
    outside = np.all(a == np.array(SENT), axis=-1)
    a[outside] = (255, 255, 255)  # 표식 색은 흰색으로 되돌리고 alpha 로만 숨긴다
    alpha = np.where(outside, 0, 255).astype("uint8")
    if alpha0 is not None:  # 원본에 투명도가 있었으면 함께 존중
        alpha = np.minimum(alpha, np.array(alpha0))
    out = np.dstack([a, alpha]).astype("uint8")
    Image.fromarray(out, "RGBA").save(dst)
    print(f"cutout → {dst}  (투명 픽셀 {int(outside.sum())} / {w*h})")


def region_mask(src, seed, thresh=48):
    """영역 안의 한 점에서 flood-fill — 검은 라인이 경계가 되어 그 영역만 마스크로 잡힌다."""
    rgb, _ = load_rgb(src)
    probe = rgb.copy()
    ImageDraw.floodfill(probe, tuple(seed), SENT, thresh=thresh)
    return np.all(np.array(probe) == np.array(SENT), axis=-1)


def tint(src, outdir, seed, name="{stem}_{color}", thresh=48, colors=None, cut=True, cut_thresh=30):
    """마스크 영역에만 multiply 틴팅해 색상별 파일을 만든다.

    multiply: 흰색→틴트색, 크림색→진한 틴트, 검은 라인→검정 유지 (자연스러운 색 변형)
    """
    outdir = pathlib.Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    mask = region_mask(src, seed, thresh)
    if mask.sum() == 0:
        sys.exit(f"seed {seed} 에서 잡힌 영역이 없습니다. probe 로 좌표를 다시 찾으세요.")

    base = Image.open(src).convert("RGBA")
    arr = np.array(base).astype("float32")
    stem = pathlib.Path(src).stem
    picked = colors or COLORS

    for cid, hx in picked.items():
        a = arr.copy()
        tintv = np.array(hex_rgb(hx), dtype="float32") / 255.0
        a[..., :3][mask] = np.clip(a[..., :3][mask] * tintv, 0, 255)
        tmp = outdir / f"__tmp_{cid}.png"
        Image.fromarray(a.astype("uint8"), "RGBA").save(tmp)
        dst = outdir / (name.format(stem=stem, color=cid) + ".png")
        if cut:
            cutout(tmp, dst, thresh=cut_thresh)
            tmp.unlink()
        else:
            tmp.rename(dst)
        print(f"  {cid:11} → {dst.name}")
    print(f"tint 완료: {len(picked)} 색 (마스크 {int(mask.sum())} px)")


def crop(src, dst, box, cut=True):
    im = Image.open(src).convert("RGBA").crop(tuple(box))
    im.save(dst)
    if cut:
        cutout(dst, dst)
    print(f"crop → {dst} {im.size}")


def probe(src, dst, step=50):
    """격자와 좌표를 얹은 이미지를 만든다 — GUI 없이 seed 좌표를 눈으로 고르기 위한 도우미."""
    im = Image.open(src).convert("RGB")
    d = ImageDraw.Draw(im)
    w, h = im.size
    for x in range(0, w, step):
        d.line([(x, 0), (x, h)], fill=(255, 0, 0), width=1)
        d.text((x + 2, 2), str(x), fill=(255, 0, 0))
    for y in range(0, h, step):
        d.line([(0, y), (w, y)], fill=(0, 128, 255), width=1)
        d.text((2, y + 2), str(y), fill=(0, 128, 255))
    im.save(dst)
    print(f"probe → {dst}  크기 {w}x{h}, 격자 {step}px")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("cutout"); p.add_argument("src"); p.add_argument("dst"); p.add_argument("--thresh", type=int, default=30)
    p = sub.add_parser("tint"); p.add_argument("src"); p.add_argument("outdir")
    p.add_argument("--seed", required=True, help="영역 안의 한 점 'x,y'")
    p.add_argument("--name", default="{stem}_{color}", help="출력 파일명 템플릿 ({stem},{color})")
    p.add_argument("--thresh", type=int, default=48, help="영역 flood-fill 임계값 (45~55 권장)")
    p.add_argument("--colors", help="쉼표 구분 색 id (기본: 전체 11색)")
    p.add_argument("--no-cut", action="store_true", help="배경 누끼 생략")
    p = sub.add_parser("crop"); p.add_argument("src"); p.add_argument("dst")
    p.add_argument("--box", required=True, help="'l,t,r,b'"); p.add_argument("--no-cut", action="store_true")
    p = sub.add_parser("probe"); p.add_argument("src"); p.add_argument("dst"); p.add_argument("--step", type=int, default=50)

    a = ap.parse_args()
    nums = lambda s: [int(v) for v in s.split(",")]

    if a.cmd == "cutout":
        cutout(a.src, a.dst, a.thresh)
    elif a.cmd == "tint":
        picked = None
        if a.colors:
            ids = [c.strip() for c in a.colors.split(",")]
            unknown = [c for c in ids if c not in COLORS]
            if unknown:
                sys.exit(f"모르는 색 id: {unknown}  (가능: {list(COLORS)})")
            picked = {c: COLORS[c] for c in ids}
        tint(a.src, a.outdir, nums(a.seed), a.name, a.thresh, picked, cut=not a.no_cut)
    elif a.cmd == "crop":
        crop(a.src, a.dst, nums(a.box), cut=not a.no_cut)
    elif a.cmd == "probe":
        probe(a.src, a.dst, a.step)


if __name__ == "__main__":
    main()
