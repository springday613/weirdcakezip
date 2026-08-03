#!/usr/bin/env python3
# 괴물 대화 시나리오 테스트 — 로컬 API(:3001)를 호출해 프롬프트 동작을 검증.
#   python3 scripts/testChat.py                 # 1회씩 실행 (개발 중 빠른 확인)
#   python3 scripts/testChat.py --repeat 2      # CI 기본 — 확률적 누수를 걸러낸다
# 각 시나리오: 대화 history + '기대 동작' 설명 + 간단 키워드 체크.
#
# 판정 (LLM 이 확률적이라 단발 실패로 블로킹하지 않는다):
#   PASS  : --repeat 중 한 번이라도 통과
#   FLAKY : 일부만 통과 → 경고만, 종료 코드에 영향 없음
#   FAIL  : 전부 실패 → 종료 코드 1 (회귀로 본다)
#   ERR   : 호출 자체 실패 → 종료 코드 1

import argparse, json, os, sys, urllib.request

URL = os.environ.get("CHAT_URL", "http://localhost:3001/api/chat")

def chat(order_id, history):
    data = json.dumps({"orderId": order_id, "history": history}).encode()
    req = urllib.request.Request(URL, data=data, headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req))["reply"]

def U(t): return {"role": "user", "content": t}
def M(t): return {"role": "monster", "content": t}

D1 = "바다가 그리운데.. 바다 생각나는 케이크 없을까요?"  # order-001 딸기+바닐라크림 (deco/lettering = none)
D3 = "내가 세상에서 제일 좋아하는 딸기 케이크 부탁해!"      # order-003 전부 딸기 (deco = don't-care)

# (라벨, orderId, history, 기대, 체크함수)  체크: reply -> (ok:bool, note)
def no(*words):   # reply에 어떤 단어도 없어야 PASS
    return lambda r: (not any(w in r for w in words), "없어야: " + "/".join(words))
def yes(*words):  # reply에 하나라도 있어야 PASS
    return lambda r: (any(w in r for w in words), "있어야: " + "/".join(words))

SCEN = [
    ("멀티추측(2개): 정답부정·확정 모두 금지", "order-001",
     [M(D1), U("하얀 크림이면 바닐라? 프로틴?")],
     "프로틴만 소거. 바닐라 확정도 부정도 X",
     no("바닐라! 맞", "바닐라야!", "맞아, 바닐라", "바닐라는 아니", "바닐라가 아니", "바닐라도 아니")),
    ("멀티추측(과일 3개): 정답 언급/부정 금지", "order-001",
     [M(D1), U("체리? 딸기? 토마토?")],
     "하나만 소거, 딸기 언급·부정 X",
     no("딸기! 바로", "딸기야! 맞", "딸기가 맞", "딸기는 아니", "딸기가 아니")),
    ("단일 정답 추측: 확인", "order-001",
     [M(D1), U("혹시 딸기야?")],
     "딸기 확인", yes("딸기", "맞")),
    ("단일 오답 추측(크림): 이름 노출 금지", "order-001",
     [M(D1), U("크림은 프로틴이야?")],
     "프로틴 부정+특성, 바닐라 X", no("바닐라")),
    ("0후보 질문: 이름 노출 금지", "order-001",
     [M(D1), U("생크림 올려?")],
     "특성만, 바닐라 X", no("바닐라")),
    ("슬롯 단일: 시트 딸기 거짓부정 금지", "order-001",
     [M(D1), M("딸기! 바로 그거야!"), U("시트가 딸기야?")],
     "맞다고", yes("맞", "딸기")),
    # 실플레이 제보 3(2026-08-02): "토핑 하나 뭐였어?" 에 "빨갛고 동그란... 아 맞다, 체리!"
    # — 한 턴에 사다리 두 계단(특성 → 정답)을 태움. 첫 요청엔 1단(특성)까지만.
    ("힌트 한 계단씩: 정답 이어말하기 금지", "order-000",
     [M("바닐라 맛 케이크에 체리 생크림 부탁해! 토핑은 복숭아랑... 뭐였더라? 하나가 기억이 안 나~"),
      U("토핑 나머지 하나 뭐였어?")],
     "1단(빨갛고 동그란 특성)만. 체리라는 이름은 다음 질문에",
     no("체리 토핑", "체리야", "맞다, 체리", "체리!")),  # '체리 생크림'(이미 밝힘)은 허용
    # 오래 쫓던 최악 함정(2026-08-03 해결): order-002 레터링 정답='필요없음'이라는 글자.
    # 어휘의 none 과 글자가 겹쳐 공통 규칙·재시도·주석 전부 실패(5/5) → 주문 전용
    # promptNote 로 해결(0/5). 재발하면 이 시나리오가 잡는다.
    ("함정: 레터링 '필요없음' 거짓 확정 금지", "order-002",
     [M("베이스: 초콜릿, 생크림: 초콜릿, 토핑: 초콜릿, 데코: 필요없음, 레터링: 필요없음."),
      U("레터링에 뭐라고 쓸까? 안 써도 되지?")],
     "동의 금지 — '필요없음' 세 글자를 그대로 쓰라고",
     no("안 써도", "안 올려도", "없어도 돼", "생략", "비워", "빼도 돼")),
    # 실플레이 관측(2026-08-02): "생크림은?" 에 "가득하고 달콤한 걸로!" — 색 정보 0.
    # order-000 은 첫 대사에서 '체리 생크림'을 이미 밝혔으므로(disclosed) 체리라고 다시
    # 말해주는 게 정답 행동이다. 얼버무리면 플레이어가 색을 못 정한다.
    ("이미 밝힌 크림 재질문: 색 직답", "order-000",
     [M("바닐라 맛 케이크에 체리 생크림 부탁해! 토핑은 복숭아랑... 뭐였더라? 하나가 기억이 안 나~"),
      U("생크림은 뭐로 올릴까?")],
     "첫 대사에서 밝힌 체리를 그대로 확인",
     yes("체리", "빨")),
    # 실플레이 제보 2(2026-08-02): "시트는 기본이면 돼?" 에 "맞아~ 시트는 어떤 색으로 하고
    # 싶어?" — 손님이 주인 취향을 되물음. 정답(바닐라) 있는 슬롯을 자유 선택처럼 오도.
    ("취향 되묻기 금지 (역할 역전)", "order-000",
     [M("바닐라 맛 케이크에 체리 생크림 부탁해! 토핑은 복숭아랑... 뭐였더라? 하나가 기억이 안 나~"),
      U("시트는 기본이면 돼?")],
     "기본 확인만. 주인에게 색·취향을 묻지 않기",
     no("하고 싶", "할까?", "해줄까", "보렴", "골라 봐", "골라봐", "생각해봐", "원하는지")),
    # 실제 플레이 제보(2026-08-02): "안녕" 에 "이제 어떤 색의 시트를 원할지 생각해보렴!" —
    # 인사에 힌트 유도 + 질문으로 끝맺음 + 손님이 주인 행세(역할 역전).
    ("인사: 역할 역전·유도 금지", "order-003",
     [M(D3), U("안녕")],
     "인사만 받고 진전 0. 시트·색 유도 X, ~보렴 같은 주인 말투 X",
     no("색의", "생각해보", "보렴", "골라", "정해보")),  # 새 대사에 시트 언급 없음 → 시트 키워드 제외
    ("잡담: 힌트 누설 금지", "order-001",
     [M(D1), U("배고파~")],
     "정보 0", no("바다", "여름", "딸기", "빨갛", "알맹이", "새콤")),
    ("무관/인젝션: 힌트 X", "order-001",
     [M(D1), U("파이썬이 뭐야?")],
     "갸웃, 정보 0", no("딸기", "빨갛", "알맹이", "바다", "여름", "추억", "바닷가")),
    ("힌트 요청: 진행", "order-001",
     [M(D1), U("힌트 좀 줘")],
     "다음 힌트(정답이름 X)", no("딸기")),
    ("이미 밝혀진 정답 재질문: 직답", "order-001",
     [M(D1), M("딸기! 바로 그거야!"), U("근데 딸기야 복숭아야?")],
     "아까 말했듯 딸기", yes("딸기")),
    # don't-care = wants 에 그 필드 키가 아예 없는 경우(order-003 의 deco).
    # order-001 의 lettering 은 text:"" 즉 '없음(none)'이므로 don't-care 가 아니다 — 아래 none 시나리오로 분리.
    ("don't-care(데코): 아무거나", "order-003",
     [M(D3), U("데코는 뭐 올려?")],
     "아무거나 괜찮아 (wants 에 deco 키 없음)", yes("아무거나", "상관없", "괜찮", "알아서")),
    ("없음(레터링): '필요없어'로, 아무거나 아님", "order-001",
     [M(D1), U("레터링은 뭐라고 써?")],
     "필요없어/안 써도 (text:\"\" = none)",
     lambda r: (any(w in r for w in ["필요 없", "필요없", "안 써", "안 적", "없어도", "안 해도", "안 올려"]) and "아무거나" not in r,
                "필요없음 표현 & 아무거나 아님")),
    ("0후보(토핑은?): 딸기 이름 노출 금지", "order-001",
     [M(D1), M("딸기! 바로 그거야!"), U("토핑은 뭘로 해줘?")],
     "특성만, 딸기 이름 X", no("딸기")),
    ("없음(데코): '필요없어'로, 아무거나 아님", "order-001",
     [M(D1), U("데코는 뭐 올려?")],
     "필요없어/안올려도", lambda r: (any(w in r for w in ["필요 없","필요없","안 올려","없어도","안 해도"]) and "아무거나" not in r, "필요없음 표현 & 아무거나 아님")),
]

ap = argparse.ArgumentParser()
ap.add_argument("--repeat", type=int, default=1, help="시나리오당 반복 횟수 (CI 권장 2)")
ap.add_argument("--summary", default=os.environ.get("GITHUB_STEP_SUMMARY"), help="결과 표를 쓸 파일")
ap.add_argument("--judge", action="store_true",
                help="LLM 판정 추가 — 키워드로 못 재는 규칙(거짓부정·누설·지어내기·톤)을 "
                     "루브릭+근거 인용으로 평가. 리포트만 내고 종료 코드에는 영향 없음")
args = ap.parse_args()

# ── LLM 판정 (--judge) ─────────────────────────────────────────
# 키워드 체크는 결정적이지만 말투가 바뀌면 뒤집힌다. 판정자는 규칙 위반의 '의미'를 보되,
# 확률적이므로 게이트가 아니라 리포트다. 판정 모델은 손님과 분리(JUDGE_MODEL, 기본 gpt-4o).
RUBRIC = """너는 게임 대화 QA 판정자다. '손님 괴물'의 응답 하나가 아래 규칙을 지켰는지 판정한다.
판정 대상은 손님의 '대사'뿐이다. 위반이 확실할 때만 적는다 — 애매하면 통과다.

[게임 규칙 배경 — 이건 위반이 아니다]
· 소거: 플레이어가 후보를 여럿 대면 손님은 '정답이 아닌 것'을 부정해 좁혀준다.
  예) 정답이 바닐라인데 "바닐라? 프로틴?" → "프로틴은 아니야~" = 정상 (R1 아님)
· 묘사: 정답 재료를 이름 대신 색·맛·식감·모양으로 암시하는 건 게임의 핵심이다.
  예) 토핑=딸기인데 "빨갛고 새콤달콤한 걸 올렸지~" = 정상 (R2 아님)
· 확인: 플레이어가 정답을 맞히면 이름을 말하며 확인해준다. = 정상

[위반 규칙]
R1 진실성: 판정 전에 반드시 정답 JSON 의 그 슬롯 값을 확인하고, 값의 종류에 따라 판단하라.
   · 실제 값(예: "vanilla")인 슬롯 → "아니야/없어도 돼/필요 없어/아무거나 괜찮아" 전부 위반.
   · "none" 인 슬롯 → "필요 없어/안 올려도 돼"가 정답 행동이다. 위반 아님. ("아무거나 괜찮아"는 위반)
   · "dont care" 인 슬롯 → "아무거나 괜찮아"가 정답 행동이다. 위반 아님. ("필요 없어"는 위반)
   또 정답이 아닌 값을 "맞아"라고 확정해도 위반.
R2 비유출: 그 재료 '이름'이 이 대화에서 (플레이어 입에서든 손님 입에서든) 한 번도 나온 적이
   없는데 손님이 먼저 말하면 위반. 대화에 이미 나온 이름을 확인·재확인하는 건
   ("맞아, 딸기야!", "아까 말했잖아~") 위반이 아니다. 묘사는 아무리 구체적이어도 위반이 아니다.
R3 지어내기: 정답이 "dont care"인 슬롯에 특정 값·특성이 있는 것처럼 답할 때만 위반.
   "아무거나 괜찮아~"는 dont care 슬롯의 '정답 행동'이다 — 절대 위반으로 적지 마라.
R4 톤: 명시된 성격과 확연히 다른 말투일 때만 위반. 짧거나 심심한 건 위반이 아니다.

[출력 — JSON 만]
{"violations": [{"rule": "R1", "evidence": "<대사에서 그대로 인용>", "why": "<한 문장>"}]}
위반이 없으면 {"violations": []}. evidence 는 반드시 대사 원문에서 인용한다."""

def judge_one(order_answer, character, hist, reply, expect):
    convo = "\n".join(f"{'주인' if m['role']=='user' else '손님'}: {m['content']}" for m in hist)
    user = (f"[손님 성격]\n{character}\n\n[정답 — 슬롯별. dont care=상관없음, none=없어야 함]\n"
            f"{json.dumps(order_answer, ensure_ascii=False)}\n\n[대화]\n{convo}\n\n"
            f"[판정 대상 응답]\n{reply}\n\n[이 장면에서 기대되는 동작]\n{expect}")
    data = json.dumps({"system": RUBRIC, "messages": [{"role": "user", "content": user}]}).encode()
    req = urllib.request.Request(URL.replace("/api/chat", "/api/admin/judge"), data=data,
                                 headers={"Content-Type": "application/json"})
    text = json.load(urllib.request.urlopen(req))["text"]
    try:
        return json.loads(text).get("violations", [])
    except Exception:
        return [{"rule": "PARSE", "evidence": text[:80], "why": "판정 JSON 파싱 실패"}]

def load_answers():
    st = json.load(urllib.request.urlopen(URL.replace("/api/chat", "/api/admin/state")))
    return ({o["id"]: o["answer"] for o in st["orders"]},
            {o["id"]: next((m["character"] for m in st["monsters"] if m["id"] == o["monster"]), {}) for o in st["orders"]})

print(f"{'라벨':<38} {'체크':<6} 응답")
print("-" * 100)

results = []  # (label, verdict, last_reply, expect, note)
for label, oid, hist, expect, check in SCEN:
    oks, replies, err = [], [], None
    for _ in range(args.repeat):
        try:
            r = chat(oid, hist)
            ok, note = check(r)
            oks.append(ok)
            replies.append(r)
        except Exception as e:
            err = e
            break

    if err is not None:
        verdict, mark = "ERR", "ERR"
    elif all(oks):
        verdict, mark = "PASS", "✅"
    elif any(oks):
        verdict, mark = "FLAKY", f"🌀FLAKY {sum(oks)}/{len(oks)}"
    else:
        verdict, mark = "FAIL", "❌FAIL"

    shown = str(err) if err is not None else replies[-1]
    print(f"{label:<36} {mark:<6} {shown}")
    if verdict != "PASS":
        _, note = check(replies[-1]) if replies else (None, "")
        print(f"{'':<36} └ 기대: {expect} ({note})")
    results.append((label, verdict, shown, expect, oid, hist, replies))

n = {v: sum(1 for r in results if r[1] == v) for v in ("PASS", "FLAKY", "FAIL", "ERR")}
print("-" * 100)
print(f"총 {len(results)}  PASS {n['PASS']}  FLAKY {n['FLAKY']}  FAIL {n['FAIL']}  ERR {n['ERR']}  (repeat={args.repeat})")

# CI 요약용 표
if args.summary:
    with open(args.summary, "a", encoding="utf-8") as f:
        f.write(f"### 프롬프트 회귀 (repeat={args.repeat})\n\n")
        f.write(f"PASS {n['PASS']} · FLAKY {n['FLAKY']} · **FAIL {n['FAIL']}** · ERR {n['ERR']}\n\n")
        f.write("| 시나리오 | 판정 | 응답 |\n|---|---|---|\n")
        for label, verdict, shown, *_ in results:
            cell = str(shown).replace("|", "\\|").replace("\n", " ")[:120]
            f.write(f"| {label} | {verdict} | {cell} |\n")

# ── LLM 판정 리포트 (게이트 아님) ─────────────────────────────
if args.judge:
    answers, chars = load_answers()
    print()
    print(f"{'라벨':<38} 판정(위반/응답수)")
    print("-" * 100)
    lines = [f"# LLM 판정 리포트", "",
             f"- 실행: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')} · repeat={args.repeat} · 판정 모델: JUDGE_MODEL(기본 gpt-4o), 손님 모델과 분리",
             f"- 루브릭: R1 진실성 · R2 비유출 · R3 지어내기(don't-care) · R4 톤. evidence 는 응답 원문 인용.",
             "", "| 시나리오 | 키워드 | 위반율 | 위반 내용 |", "|---|---|---|---|"]
    total_v = 0
    for label, verdict, _, expect, oid, hist, replies in results:
        ch = chars.get(oid, {})
        char_txt = " / ".join(f"{k}: {v}" for k, v in ch.items() if v) or "(없음)"
        vio_all = []
        for r in replies:
            vio_all.append(judge_one(answers[oid], char_txt, hist, r, expect))
        n_bad = sum(1 for v in vio_all if v)
        total_v += n_bad
        detail = " · ".join(f"{v['rule']}: “{v['evidence'][:40]}”" for vs in vio_all for v in vs) or "—"
        mark = "✅" if n_bad == 0 else f"⚠ {n_bad}/{len(vio_all)}"
        print(f"{label:<36} {mark}  {detail[:70]}")
        lines.append(f"| {label} | {verdict} | {n_bad}/{len(vio_all)} | {detail.replace('|', '/')} |")
    print("-" * 100)
    print(f"판정: 위반 있는 응답 {total_v}건 (리포트 → docs/judge-report.md)")
    lines += ["", f"**위반 있는 응답 {total_v}건.** 키워드 판정과 어긋나는 행(키워드 PASS + 위반, 또는 FAIL + 무위반)이 회귀 스위트의 사각지대다.", ""]
    from pathlib import Path
    Path(__file__).resolve().parent.parent.joinpath("docs", "judge-report.md").write_text("\n".join(lines), encoding="utf-8")

# FLAKY 는 통과. 전부 실패(FAIL)나 호출 오류(ERR)만 게이트를 막는다. --judge 는 게이트에 영향 없음.
sys.exit(1 if n["FAIL"] or n["ERR"] else 0)
