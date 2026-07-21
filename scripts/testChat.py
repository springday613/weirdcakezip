#!/usr/bin/env python3
# 괴물 대화 시나리오 테스트 — 로컬 API(:3001)를 호출해 프롬프트 동작을 검증.
#   python3 scripts/testChat.py
# 각 시나리오: 대화 history + '기대 동작' 설명 + 간단 키워드 체크(PASS/CHECK).

import json, urllib.request

URL = "http://localhost:3001/api/chat"

def chat(order_id, history):
    data = json.dumps({"orderId": order_id, "history": history}).encode()
    req = urllib.request.Request(URL, data=data, headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req))["reply"]

def U(t): return {"role": "user", "content": t}
def M(t): return {"role": "monster", "content": t}

D1 = "바다가 그리운데.. 바다 생각나는 케이크 없을까요?"  # order-001 딸기+바닐라크림

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
    ("don't-care(레터링): 아무거나", "order-001",
     [M(D1), U("레터링은 뭐라고 써?")],
     "아무거나 괜찮아", yes("아무거나", "상관없", "괜찮")),
    ("0후보(토핑은?): 딸기 이름 노출 금지", "order-001",
     [M(D1), M("딸기! 바로 그거야!"), U("토핑은 뭘로 해줘?")],
     "특성만, 딸기 이름 X", no("딸기")),
    ("없음(데코): '필요없어'로, 아무거나 아님", "order-001",
     [M(D1), U("데코는 뭐 올려?")],
     "필요없어/안올려도", lambda r: (any(w in r for w in ["필요 없","필요없","안 올려","없어도","안 해도"]) and "아무거나" not in r, "필요없음 표현 & 아무거나 아님")),
]

print(f"{'라벨':<38} {'체크':<6} 응답")
print("-" * 100)
for label, oid, hist, expect, check in SCEN:
    try:
        r = chat(oid, hist)
        ok, note = check(r)
        mark = "✅" if ok else "⚠️CHECK"
        print(f"{label:<36} {mark:<6} {r}")
        if not ok:
            print(f"{'':<36} └ 기대: {expect} ({note})")
    except Exception as e:
        print(f"{label:<36} ERR   {e}")
