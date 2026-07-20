# AGENTS.md — 에이전트 기여 지침

이 파일은 **AI 에이전트(Claude Code / Codex 등)** 를 위한 리포 규약입니다.
`CLAUDE.md` 는 이 파일로의 symlink 이므로 어느 도구로 들어와도 같은 규약을 봅니다.
사람용 소개·실행법은 `README.md` 를 보세요. (이 문서는 README 를 참조하지 않습니다 — 대상이 다릅니다.)

## 이 리포는 무엇인가

"괴물 세상의 케이크 가게" — 손님(LLM)이 애매한 주문을 내면, 플레이어가 대화로 의도를 좁혀
케이크를 만들고, 결정적 코드가 채점하는 웹 게임. NAN 2026 해커톤 사전과제.

**핵심 설계**: 대화(재미)는 LLM, 채점(공정성)은 코드. 이 경계를 흐리지 마세요.

## 프로젝트 구조

```
cake-shop/
├── src/
│   ├── App.jsx              상태머신: TITLE → PLAYING → RESULT → END
│   ├── screens/             화면별 컴포넌트 (Title / Order / Result)
│   ├── components/          CakeView · IngredientPalette · ChatBox
│   ├── data/
│   │   ├── ingredients.js   재료 vocabulary + sheetType() 조합 판정
│   │   └── orders.js        주문 + hidden.wants(숨은 정답) — 채점 기준
│   ├── scoreCake.js         결정적 채점 로직 (게임의 심장)
│   ├── chatClient.js        프론트 → /api/chat
│   └── judgeClient.js       프론트 → /api/judge
├── api/                     Vercel 서버리스 함수 (Node, 프론트에 키 노출 안 됨)
│   ├── _llm.js              LLM 프로바이더 추상화 (OpenAI/Anthropic)
│   ├── _monsterPrompt.js    손님 시스템 프롬프트 빌더
│   ├── chat.js              손님 대화 (런타임 LLM)
│   └── judge.js             채점 (scoreCake 호출, LLM 아님)
├── devServer.js             로컬 API 서버 (npm run api, port 3001)
├── scripts/                 회귀 테스트 하네스 (testChat.py 등)
├── rules/                   에이전트용 세부 규칙 (아래 참조)
└── docs/                    사람용 개발 기록 (prompt-engineering-log 등)
```

## 핵심 파일 (건드릴 때 주의)

| 파일 | 왜 민감한가 |
|---|---|
| `src/scoreCake.js` | 채점의 유일한 근원. "don't-care"(주문에 없던 필드는 채점 제외) 규칙이 미묘함 |
| `src/data/orders.js` | `hidden.wants` 가 곧 정답. 프론트로 새어나가면 안 됨(대화로만 유추) |
| `api/_monsterPrompt.js` | 프롬프트 한 줄 바꾸면 손님 행동이 흔들림 → 반드시 `scripts/testChat.py` 로 회귀 확인 |
| `src/data/ingredients.js` | `sheetType()` 이 유효 조합을 판정. 재료 추가 시 여기부터 |

## 개발 명령

```bash
npm run dev      # 프론트 (5173) — 키 없이 mock 동작
npm run api      # 로컬 서버리스 (3001) — .env.local 필요
npm run build    # 프로덕션 빌드 (CI 가 PR마다 이걸 돌린다)
python scripts/testChat.py   # 손님 대화 회귀 테스트 (api 서버가 떠 있어야 함)
```

## 작성 원칙

- **JS만 사용** (TypeScript 도입 안 함). 타입 주석·인터페이스 금지.
- 경로·모델명 하드코딩 금지. 모델은 env(`OPENAI_MODEL`)로, 키는 서버리스에서만.
- 주변 코드의 스타일(한글 주석 밀도, 네이밍, 관용구)을 따를 것.
- 스코프 밖 파일은 건드리지 않는다. 요청받은 범위만.
- 프롬프트/채점 변경은 **재현 → 근거 → 수정** 순서. 추측으로 방어 코드 넣지 말 것.

## PR 리뷰

PR 리뷰 규칙은 [`rules/code-review.md`](./rules/code-review.md) 를 따릅니다.
리뷰어(사람이든 AI든)는 그 체크리스트로 판단하고, `.github/pull_request_template.md` 형식으로 PR 을 작성합니다.

## 브랜치·PR

- `main` 에 직접 커밋하지 않는다. `feat/*` 브랜치에서 작업 → PR.
- Notion Task([S번호])와 PR 제목을 연동한다. (예: `S2: 에이전트 하네스 세팅`)
- force-push 는 사용자 승인 후에만.
