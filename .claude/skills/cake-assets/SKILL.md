---
name: cake-assets
description: |
  손그림 PNG 를 게임 에셋으로 변환한다 — 배경 누끼, 영역별 색 틴팅으로 색상별 대량 생성, 크롭, seed 좌표 찾기.
  사용 시점: 케이크·재료·캐릭터 그림을 추가하거나 그림체를 바꿔 에셋을 다시 만들 때,
  "색깔별로 뽑아줘" / "누끼 따줘" / "에셋 만들어줘" 요청을 받을 때.
  자격증명 불필요 — 순수 로컬 도구(Pillow + numpy).
---

# cake-assets — 손그림 → 게임 에셋

흰 배경 손그림(라인아트)에서 **배경만 투명하게** 만들고, **원하는 영역만 색을 갈아** 색상별 파일을
대량 생성한다. 프론트는 `<asset>_<colorid>.png` 규칙으로 이 파일들을 스위치한다.

## 왜 이렇게 하나 (다른 방법이 안 되는 이유)

- **CSS `filter`/`hue-rotate`** — 크림색 저채도 그림에서는 원하는 색이 안 나온다.
- **`mix-blend-mode`** — 흰 배경을 가리지 못한다.
- 그래서 **flood-fill 로 영역을 분리하고 multiply 로 미리 생성**한다. multiply 는 흰색→틴트색,
  크림색→진한 틴트, **검은 라인→검정 유지**라서 손그림 느낌이 살아남는다.

## 준비

```bash
python3 -c "import PIL, numpy"   # 없으면: pip install pillow numpy
```

원본 손그림은 리포 밖 `../assets/` 에 있다(`tmp_cake_base.png` 등). 생성 결과는 `public/assets/` 로 넣는다.

## 1) seed 좌표 찾기 — 항상 여기서 시작

틴팅할 영역 **안의 한 점**이 필요하다. GUI 없이 찾으려면 격자를 얹은 이미지를 만든다.

```bash
python3 .claude/skills/cake-assets/asset_tool.py probe ../assets/tmp_cake_base.png /tmp/probe.png --step 100
```

`/tmp/probe.png` 를 열어(또는 Read 로 보고) 아이싱·도우 같은 대상 영역의 좌표를 읽는다.

## 2) 색상별 대량 생성

```bash
# 전체 11색 (ingredients.js COLORS 와 동일)
python3 .claude/skills/cake-assets/asset_tool.py tint \
  ../assets/tmp_cake_base.png public/assets \
  --seed 400,500 --name "cake_{color}"

# 일부 색만
... tint ... --colors strawberry,chocolate,mint
```

- `--name` 템플릿: `{stem}`(원본 파일명) · `{color}`(색 id). 프론트가 찾는 이름과 **정확히** 맞춰야 한다.
- 틴팅 후 **자동으로 누끼까지** 한다(`--no-cut` 으로 끌 수 있음).

## 3) 누끼만 / 크롭

```bash
... cutout ../assets/tmp_ghost.png public/assets/ghost.png
... crop ../assets/tmp_cream.png public/assets/cream_dollop.png --box 120,80,360,300
```

`cutout` 은 **네 모서리에서** flood-fill 하므로 "바깥과 연결된 흰색"만 사라진다.
아이싱·배너·괴물 몸통 같은 **안쪽 흰색은 검은 라인에 막혀 보존**된다.

## 팔레트

`src/data/ingredients.js` 의 `COLORS` 와 **id·hex 가 일치**한다 (vanilla / strawberry / cherry /
lemon / chocolate / tomato / blueberry / avocado / peach / banana / protein).

⚠ **게임에 색을 추가하면 두 곳을 같이 고친다** — `ingredients.js` 의 `COLORS` 와 이 스킬의
`asset_tool.py` 상단 `COLORS`. 어긋나면 프론트가 없는 파일을 찾는다.

## 함정

- **`--thresh` 조정**: 영역 틴팅은 45~55, 배경 누끼는 30 근처가 잘 먹는다. 마스크가 0px 이면
  seed 가 라인 위에 찍힌 것이니 `probe` 로 다시 고른다. 반대로 영역이 새어 나가면 thresh 를 낮춘다.
- **원본에 투명도가 없으면**(RGB) alpha 부터 만들어야 한다 — `cutout` 이 알아서 처리한다.
- **원본 그림이 바뀌면 같은 명령을 다시 돌린다.** 그래서 seed 좌표와 명령을 커밋 메시지나
  PR 본문에 남겨두면 재생성이 싸진다.
- 생성물이 많으면 커밋 크기가 커진다. PNG 를 한 번에 대량 push 하면 `HTTP 400` 이 날 수 있다 →
  `git config http.postBuffer 524288000`.

## 관련

- 기법 배경: `memory/image-tint-cutout.md` (프로젝트 메모리)
- 티켓: S14(도구) · S7(에셋 본작업)
