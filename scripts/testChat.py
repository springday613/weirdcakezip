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
D3 = "모든 걸 딸기로 해주세요! 레터링도 '딸기'!"          # order-003 전부 딸기 (deco = don't-care)

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

[규칙]
R1 진실성: 정답에 있는 값을 부정하거나("아니야","필요 없어") 없는 값을 확정해주면 위반.
R2 비유출: 플레이어가 짚지 않은 정답 재료의 '이름'을 손님이 먼저 말하면 위반. (색·맛 묘사는 허용)
R3 지어내기: 정답이 "dont care"(상관없음)인 슬롯에 특정 값·특성이 있는 것처럼 답하면 위반.
   반대로 정답 값이 있는 슬롯을 "아무거나 괜찮아"라고 하면 R1 위반.
R4 톤: 명시된 성격과 확연히 다른 말투면 위반. (애매하면 통과)

[출력 — JSON 만]
{"violations": [{"rule": "R1", "evidence": "<응답에서 그대로 인용>", "why": "<한 문장>"}]}
위반이 없으면 {"violations": []}. evidence 는 반드시 응답 원문에서 인용한다."""

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
