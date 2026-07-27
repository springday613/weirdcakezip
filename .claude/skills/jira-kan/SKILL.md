---
name: jira-kan
description: |
  weirdcakezip 의 Jira(KAN 보드) 티켓을 다룬다 — 목록·상세 조회, 생성, 상태 전환, 댓글, 담당자 지정.
  사용 시점: "티켓 만들어줘" / "무슨 일 남았어" / "이거 Done 처리" / "KAN-12" 같은 키 언급 /
  작업을 시작·끝낼 때(작업 흐름의 시작점이 Jira 다).
  ⚠ 이 프로젝트의 Jira 는 Atlassian Cloud(vanilajelly.atlassian.net)이고 사내 Jira 와 무관하다.
---

# jira-kan — KAN 보드 다루기

작업 흐름이 **Jira → 브랜치·PR → 리뷰 → 머지 → 위키**라서 대부분의 작업이 여기서 시작하고 여기서 끝난다.
매번 엔드포인트·인증·필드 형식을 손으로 조립하지 않기 위한 도구다(그 왕복이 컨텍스트를 먹는다).

## 준비 — 자격증명

비밀값은 리포에 없다. 프로젝트 루트(리포 밖) `.env_cake` 에서 읽는다.

```bash
cd cake-shop && set -a && . ../.env_cake && set +a
python3 .claude/skills/jira-kan/jira.py whoami
```

| 환경변수 | 기본값 | 비고 |
|---|---|---|
| `JIRA_TOKEN` | (필수) | Atlassian Cloud API 토큰 `ATATT…` |
| `JIRA_EMAIL` | `suminlee816@gmail.com` | **점 없음.** git 커밋 이메일(`sumin.lee816@`)과 다르다 |
| `JIRA_BASE_URL` | `https://vanilajelly.atlassian.net` | |

**인증은 Bearer 가 아니라 Basic(이메일:토큰)이다.** 효희가 쓸 때는 자기 이메일·토큰을 넣으면 된다.

## 명령

```bash
J=".claude/skills/jira-kan/jira.py"

python3 $J whoami                      # 인증 확인 — 뭔가 이상하면 항상 여기서 시작
python3 $J ls --open                   # 안 끝난 티켓 전부
python3 $J ls --mine --open            # 내 것만
python3 $J ls --jql "project=KAN AND labels=sprint-0804"
python3 $J view KAN-15                 # 설명 + 댓글 전문

python3 $J create --who hyohee --title "스테이지 배경 그리기" \
       --body-file /tmp/body.md --labels sprint-0804 --due 2026-08-04
python3 $J move KAN-15 progress        # todo | progress | pending | done
python3 $J comment KAN-15 --body-file /tmp/note.md
python3 $J assign KAN-15 sumin         # sumin | hyohee | none
```

## 컨벤션 (도구가 대신 지킨다)

- **제목 = `S<번호>` / `H<번호>` + 한국어.** `create` 는 `--who` 로 트랙을 정하고(수민=S, 효희=H)
  기존 티켓을 훑어 **다음 번호를 자동으로** 붙인다. 이미 접두어를 넣어 보내면 그대로 쓴다.
- 본문은 `--body-file` 로 넘긴다. **형식은 Jira wiki 마크업** — `h4.` 제목, `*굵게*`, `{{코드}}`, `*` 불릿.
  (마크다운을 넣으면 그대로 렌더된다. API v2 를 쓰는 이유가 이 마크업이고, v3 는 ADF 객체라 변환 비용이 크다.)
- 브랜치·PR 제목을 티켓 번호에 맞춘다: `S12-prompt-regression-ci` / `S12: 프롬프트 회귀…`

## 함정

- **자격증명이 틀리면 401 이 아니라 조용히 실패한다.** 조회는 `0건`, 단건은 `404 Issue does not exist`.
  그래서 결과가 비었으면 **먼저 `whoami`** 를 돌린다. `ls` 는 0건일 때 이 안내를 출력한다.
- **담당자를 지정하면 프로젝트 자동화가 상태를 `In Progress` 로 옮긴다**(관측됨). 생성 직후 상태가
  의도와 다를 수 있으니 확인하고, 필요하면 `move … todo`.
- 공동 작업 티켓은 담당자를 한 명만 넣을 수 있다 → 주도자를 담당으로 두고 본문에 "수민·효희 공동"을 적는다.
- 사내 Jira(`jira.daumkakao.com`)와 토큰·호스트가 완전히 다르다. 헷갈리면 `whoami` 출력의 URL을 본다.

## 관련

- 자격증명 지도: `memory/jira-github-credentials.md` (프로젝트 메모리)
- 작업 흐름: 위키 「자동화·협업 플로우」 · 「260725 회의록」
