# 괴물 세상의 케이크 가게 🎂

NAN 2026 사전과제 — 애매한 주문의 진짜 마음을 읽어 케이크를 만드는 캐주얼 게임.
이 리포는 **walking skeleton**(끝에서 끝까지 도는 최소 뼈대)입니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173  — API 키 없이 mock 판정으로 동작
```

실제 Claude 판정까지 로컬에서 보려면:
```bash
npm i -g vercel
vercel dev         # /api/judge 서버리스가 함께 뜬다
# 사전: .env.local 에 ANTHROPIC_API_KEY 설정 (.env.example 참고)
```

## 구조 (척추 3개)

| 파일 | 역할 |
|---|---|
| `src/data/orders.js` | ① 주문 데이터 + **숨은 정답(hidden)** — 판정 기준 |
| `src/*` (cake 상태) | ② 플레이어가 만드는 케이크 객체 `{sheet, color, toppings[], lettering}` |
| `api/judge.js` | ③ 판정 서버리스 (mock + Claude). **게임의 심장** |

```
TITLE → PLAYING(orderIndex) → RESULT → 다음 or END   (App.jsx 상태머신)
```

## 다음 할 일 (build order)
1. [x] 스캐폴딩 → 빈 화면 Vercel 배포 (파이프라인 증명)
2. [x] 척추 3개 계약 + walking skeleton (mock 판정으로 end-to-end)
3. [ ] **`api/judge.js`의 실제 Claude 판정 튜닝** (주문 1개로) ← 가장 위험한 부분 조기 검증
4. [ ] 주문·재료·괴물 아트 늘리기
5. [ ] 폴리시 (효과음, 공유 결과화면 등)

## 원칙
작게·확실히·완성 우선. TS·복잡한 루브릭·최적화·리더보드 등 과한 스펙은 의도적으로 뺌.
