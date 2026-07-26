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
args = ap.parse_args()

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
    results.append((label, verdict, shown, expect))

n = {v: sum(1 for _, vv, _, _ in results if vv == v) for v in ("PASS", "FLAKY", "FAIL", "ERR")}
print("-" * 100)
print(f"총 {len(results)}  PASS {n['PASS']}  FLAKY {n['FLAKY']}  FAIL {n['FAIL']}  ERR {n['ERR']}  (repeat={args.repeat})")

# CI 요약용 표
if args.summary:
    with open(args.summary, "a", encoding="utf-8") as f:
        f.write(f"### 프롬프트 회귀 (repeat={args.repeat})\n\n")
        f.write(f"PASS {n['PASS']} · FLAKY {n['FLAKY']} · **FAIL {n['FAIL']}** · ERR {n['ERR']}\n\n")
        f.write("| 시나리오 | 판정 | 응답 |\n|---|---|---|\n")
        for label, verdict, shown, _ in results:
            cell = str(shown).replace("|", "\\|").replace("\n", " ")[:120]
            f.write(f"| {label} | {verdict} | {cell} |\n")

# FLAKY 는 통과. 전부 실패(FAIL)나 호출 오류(ERR)만 게이트를 막는다.
sys.exit(1 if n["FAIL"] or n["ERR"] else 0)
