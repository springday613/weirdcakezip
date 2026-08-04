"""public/assets 의 PNG 를 WebP 로 바꾼다 — 맛/색 전환이 느린 문제.

케이크 베이스가 장당 1.4MB(961×1086)인데 화면엔 288px 로 그린다. 맛을 바꿀 때마다
1.4MB 를 새로 받으니 눈에 띄게 느리다. 연필 텍스처는 PNG 로 잘 안 줄어드는 반면
WebP 는 13배까지 줄어든다(실측: 1446KB → 106KB, q90/720px 에서 원본과 구분 불가).

    python3 to_webp.py [--dry]

바꾼 뒤 코드의 확장자 참조도 같이 고쳐야 한다 (fix_refs 가 처리).
"""

import re
import sys
from pathlib import Path

from PIL import Image

from split_cake_parts import HERE, REPO

DEST = REPO / "public" / "assets"
MAX_W = 720          # 화면 최대 288px(.cake) → 2.5배. 더 키워도 눈에 안 보인다
QUALITY = 90

# 확장자를 바꿔야 하는 소스 — 문자열로 경로를 조립하는 곳들
REF_FILES = [
    REPO / "src" / "components" / "CakeView.jsx",
    REPO / "src" / "components" / "IngredientPalette.jsx",
    REPO / "src" / "screens" / "TitleScreen.jsx",
    REPO / "src" / "data" / "ingredients.js",
    REPO / "src" / "data" / "cakeLayout.json",
]


def convert(dry=False):
    pngs = sorted(DEST.glob("*.png"))
    before = sum(p.stat().st_size for p in pngs)
    after = 0
    for p in pngs:
        im = Image.open(p).convert("RGBA")
        if im.size[0] > MAX_W:
            im = im.resize((MAX_W, round(MAX_W * im.size[1] / im.size[0])), Image.LANCZOS)
        out = p.with_suffix(".webp")
        if not dry:
            im.save(out, "WEBP", quality=QUALITY, method=6)
            p.unlink()
            after += out.stat().st_size
    print(f"  {len(pngs)}개  {before/1048576:.1f} MB → {after/1048576:.1f} MB "
          f"({before/max(after,1):.1f}배 감소)")
    return len(pngs)


def fix_refs(dry=False):
    """/assets/... .png 참조를 .webp 로. 다른 png 문자열은 안 건드린다."""
    pat = re.compile(r'(/assets/[^"`\')\s]*?|(?<=")[\w-]+)\.png')
    total = 0
    for f in REF_FILES:
        s = f.read_text(encoding="utf-8")
        new, n = pat.subn(lambda m: m.group(1) + ".webp", s)
        if n and not dry:
            f.write_text(new, encoding="utf-8")
        if n:
            print(f"  {f.name}: {n}곳")
        total += n
    return total


if __name__ == "__main__":
    dry = "--dry" in sys.argv
    convert(dry)
    fix_refs(dry)
