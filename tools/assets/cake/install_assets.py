"""build/ 산출물을 게임 리포의 public/assets/ 로 설치하고 cakeLayout.json 을 만든다.

출력은 전부 **WebP** 다. 연필 텍스처는 PNG 로 잘 안 줄고, 맛을 바꿀 때마다 1.4MB 를
새로 받으면 전환이 눈에 띄게 느리다 (to_webp.py 참조).

파일명은 프론트 규칙에 맞춘다:
  · 재료·토핑·데코 칩  → ing_<id>.webp   (IngredientPalette 가 이 경로로 찾는다)
  · 케이크 맛 변형      → cake_<color>.webp · cream_<color>.webp
  · 스프링클 알갱이     → sprinkle_grain_NN.webp

    python3 install_assets.py
"""

import json
from pathlib import Path

from PIL import Image

from split_cake_parts import HERE, REPO

BUILD = HERE / "build"
DEST = REPO / "public" / "assets"
LAYOUT_OUT = REPO / "src" / "data" / "cakeLayout.json"

MAX_W = 720          # 화면 최대 288px(.cake) → 2.5배
QUALITY = 90

TOPPINGS = ["strawberry", "blueberry", "banana", "lemon", "peach", "cherry",
            "chocolate", "tomato", "almond", "chicken", "avocado"]
SHEET_BASE = ["flour", "milk", "egg", "butter", "water",
              "soymilk", "riceflour", "veggieoil", "icecream", "gelatin"]
CANDLES = ["birthday_candle", "heart_candle_red", "heart_candle_pink", "heart_candle_blue", "bomb_candle"]
COLORS = ["vanilla", "strawberry", "cherry", "lemon", "chocolate", "tomato",
          "blueberry", "avocado", "peach", "banana", "protein"]


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    decos = json.loads((BUILD / "decos.json").read_text(encoding="utf-8"))
    tops = json.loads((BUILD / "toppings.json").read_text(encoding="utf-8"))["toppings"]
    lay = json.loads((BUILD / "layout.json").read_text(encoding="utf-8"))

    n = 0

    def put(src, stem):
        """src 그림을 줄여 DEST/<stem>.webp 로 저장한다.

        stem 은 '확장자 없는 이름' 이다 — 출력은 언제나 WebP 라서 호출부가 확장자를
        정하지 않는다. (예전엔 여기에 .png 를 넘겼는데, 읽는 사람이 PNG 가 나온다고
        오해했다 — PR #21 리뷰에서 실제로 걸렸다.)
        """
        nonlocal n
        im = Image.open(src).convert("RGBA")
        if im.size[0] > MAX_W:
            im = im.resize((MAX_W, round(MAX_W * im.size[1] / im.size[0])), Image.LANCZOS)
        im.save(DEST / f"{stem}.webp", "WEBP", quality=QUALITY, method=6)
        n += 1

    for c in COLORS:                                    # 케이크 맛 변형
        put(BUILD / "variants" / f"cake_{c}.png", f"cake_{c}")
        put(BUILD / "variants" / f"cream_{c}.png", f"cream_{c}")
    for t in TOPPINGS:
        put(BUILD / "toppings" / f"{t}.png", f"ing_{t}")
    for b in SHEET_BASE:
        put(BUILD / "ingredients" / f"ing_{b}.png", f"ing_{b}")
    for c in CANDLES:                                   # 하트초는 핑크 틴트본
        put(BUILD / Path(decos[c]["file"]), f"ing_{c}")
    put(BUILD / "decos" / "sprinkle.png", "ing_sprinkle")
    grains = decos["sprinkle"]["grains"]
    for i, g in enumerate(grains):
        put(BUILD / Path(g["file"]), f"sprinkle_grain_{i:02d}")
    for f in ("bowl_empty.png", "bowl_dough.png", "dough_knead.png"):
        put(BUILD / "ingredients" / f, Path(f).stem)

    # 레이아웃 — 프론트가 쓰기 좋게 경로를 /assets 규칙으로 바꿔 저장
    out = {
        "canvas": lay["canvas"],
        "cream": {"size": lay["cream"]["size"],
                  "slots": lay["cream"]["slots"], "fill_order": lay["cream"]["fill_order"]},
        "topping": {"slots": lay["strawberry"]["slots"],
                    "fill_order": lay["strawberry"]["fill_order"],
                    "size": {t: tops[t]["size"] for t in TOPPINGS}},
        "candle": {"anchor": "bottom", "scale": lay["candle"]["scale"],
                   "size": lay["candle"]["size"],
                   "arrangements": lay["candle"]["arrangements"]},
        "sprinkle": {"scale": lay["sprinkle"]["scale"],
                     "per_click": lay["sprinkle"]["per_click"],
                     "max_clicks": lay["sprinkle"]["max_clicks"],
                     "grains": [f"sprinkle_grain_{i:02d}.webp" for i in range(len(grains))],
                     "slots": lay["sprinkle"]["slots"]},
    }
    LAYOUT_OUT.parent.mkdir(parents=True, exist_ok=True)
    LAYOUT_OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"  {n}개 → {DEST}")
    print(f"  레이아웃 → {LAYOUT_OUT}")
    print(f"    생크림 {len(out['cream']['slots'])}자리 · 토핑 {len(out['topping']['slots'])}자리 · "
          f"초 {len(out['candle']['arrangements'])}배치 · 스프링클 {len(out['sprinkle']['slots'])}자리")


if __name__ == "__main__":
    main()
