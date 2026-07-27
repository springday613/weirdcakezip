#!/usr/bin/env python3
"""weirdcakezip Jira(KAN) CLI — 티켓 조회·생성·전환·댓글.

인증: Basic (계정 이메일 + API 토큰). 값은 환경변수에서 읽는다 — 이 파일에 비밀값은 없다.
  JIRA_TOKEN     필수. Atlassian Cloud API 토큰 (ATATT…)
  JIRA_EMAIL     선택. 기본 suminlee816@gmail.com  ★ 점 없음 (git 커밋 이메일과 다르다)
  JIRA_BASE_URL  선택. 기본 https://vanilajelly.atlassian.net

  whoami                                    인증 확인 (틀리면 조회가 조용히 0건이 된다)
  ls  [--jql "…"] [--mine] [--open]        티켓 목록
  view KAN-12                               한 건 상세(설명·댓글)
  create --who sumin|hyohee|none --title "…" [--body-file f] [--labels a,b] [--due 2026-08-04]
  move KAN-12 done|progress|todo|pending    상태 전환
  comment KAN-12 --body-file f              댓글 (본문은 Jira wiki 마크업)
  assign KAN-12 sumin|hyohee|none
"""
import argparse, base64, json, os, sys, urllib.error, urllib.parse, urllib.request

BASE = os.environ.get("JIRA_BASE_URL", "https://vanilajelly.atlassian.net").rstrip("/")
EMAIL = os.environ.get("JIRA_EMAIL", "suminlee816@gmail.com")
PROJECT = os.environ.get("JIRA_PROJECT", "KAN")

# 담당자 — S 트랙 = 수민(구현·문서), H 트랙 = 효희(아트·목업)
PEOPLE = {
    "sumin": ("712020:0ebcfa3d-d216-460b-9f39-cd5c10f95328", "S"),
    "hyohee": ("712020:cc099535-60da-4fa2-a05d-8268446c796f", "H"),
}
STATUS = {"done": "Done", "progress": "In Progress", "todo": "To Do", "pending": "Pending"}


def api(method, path, body=None):
    token = os.environ.get("JIRA_TOKEN")
    if not token:
        sys.exit("JIRA_TOKEN 이 없습니다. 프로젝트 루트의 .env_cake 를 로드하세요:\n"
                 "  set -a && . ../.env_cake && set +a")
    auth = base64.b64encode(f"{EMAIL}:{token}".encode()).decode()
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": "Basic " + auth, "Accept": "application/json",
                 "Content-Type": "application/json"},
        method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            t = r.read().decode()
            return json.loads(t) if t.strip() else None
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:400]
        if e.code == 401:
            detail += ("\n\n힌트: 401 은 대개 이메일 오타다. Bearer 가 아니라 Basic 이며, "
                       "이메일은 점 없는 suminlee816@gmail.com 이다.")
        sys.exit(f"HTTP {e.code}\n{detail}")


def next_number(prefix):
    """S/H 트랙의 다음 번호 — 기존 제목의 접두어를 훑어 최댓값+1."""
    data = api("GET", f"/rest/api/3/search/jql?jql={urllib.parse.quote(f'project={PROJECT}')}"
                      f"&maxResults=100&fields=summary")
    used = []
    for i in data.get("issues", []):
        s = i["fields"]["summary"].lstrip("⭐ ").strip()
        if s.startswith(prefix) and ":" in s:
            head = s.split(":", 1)[0][len(prefix):]
            if head.isdigit():
                used.append(int(head))
    return (max(used) + 1) if used else 1


def cmd_whoami(a=None):
    """인증 확인. ★ 자격증명이 틀리면 조회 API 는 401 이 아니라 '0건'·404 로 조용히 실패한다."""
    d = api("GET", "/rest/api/3/myself")
    print(f"{d.get('displayName')} <{d.get('emailAddress')}>  ({BASE}, project {PROJECT})")
    return d


def cmd_ls(a):
    jql = a.jql or f"project={PROJECT}"
    if a.mine:
        jql += " AND assignee=currentUser()"
    if a.open:
        jql += " AND statusCategory != Done"
    jql += " ORDER BY key ASC"
    d = api("GET", f"/rest/api/3/search/jql?jql={urllib.parse.quote(jql)}"
                   f"&maxResults=100&fields=summary,status,assignee,duedate")
    for i in d.get("issues", []):
        f = i["fields"]
        who = (f.get("assignee") or {}).get("displayName", "-")
        print(f"{i['key']:8}{f['status']['name']:12}{who:15}{f.get('duedate') or '-':12}{f['summary']}")
    n = len(d.get("issues", []))
    print(f"— {n} 건")
    if n == 0:
        print("\n0건입니다. 자격증명이 틀리면 401 이 아니라 '0건'으로 조용히 실패하니 확인하세요:")
        print("  python3 jira.py whoami")


def cmd_view(a):
    d = api("GET", f"/rest/api/2/issue/{a.key}?fields=summary,status,assignee,labels,duedate,description,comment")
    f = d["fields"]
    print(f"{d['key']}  [{f['status']['name']}]  {f['summary']}")
    print(f"담당 {(f.get('assignee') or {}).get('displayName','-')} · 라벨 {','.join(f['labels']) or '-'} · 기한 {f.get('duedate') or '-'}")
    print("-" * 80)
    print(f.get("description") or "(설명 없음)")
    for c in (f.get("comment") or {}).get("comments", []):
        print("-" * 80)
        print(f"댓글 — {c['author']['displayName']} {c['created'][:16]}")
        print(c["body"])


def cmd_create(a):
    aid, prefix = PEOPLE.get(a.who, (None, "S"))
    title = a.title
    if not title.startswith(("S", "H")) or ":" not in title.split(" ")[0]:
        title = f"{prefix}{next_number(prefix)}: {title}"  # 컨벤션: S/H + 번호 + 한국어 제목
    fields = {"project": {"key": PROJECT}, "issuetype": {"name": "Task"}, "summary": title}
    if a.body_file:
        fields["description"] = open(a.body_file, encoding="utf-8").read()
    if a.labels:
        fields["labels"] = [x.strip() for x in a.labels.split(",")]
    if a.due:
        fields["duedate"] = a.due
    if aid:
        fields["assignee"] = {"id": aid}
    r = api("POST", "/rest/api/2/issue", {"fields": fields})
    print(f"{r['key']}  {title}")
    print(f"{BASE}/browse/{r['key']}")
    if aid:
        print("※ 담당자를 지정하면 프로젝트 자동화가 상태를 In Progress 로 옮길 수 있다 — 확인 필요")


def cmd_move(a):
    want = STATUS[a.to]
    tr = api("GET", f"/rest/api/3/issue/{a.key}/transitions")
    tid = next((t["id"] for t in tr["transitions"] if t["to"]["name"] == want), None)
    if not tid:
        sys.exit(f"{a.key} 에서 '{want}' 로 가는 전환이 없습니다: "
                 f"{[t['to']['name'] for t in tr['transitions']]}")
    api("POST", f"/rest/api/3/issue/{a.key}/transitions", {"transition": {"id": tid}})
    print(f"{a.key} → {want}")


def cmd_comment(a):
    body = open(a.body_file, encoding="utf-8").read() if a.body_file else a.body
    api("POST", f"/rest/api/2/issue/{a.key}/comment", {"body": body})
    print(f"{a.key} 댓글 등록")


def cmd_assign(a):
    aid = PEOPLE.get(a.who, (None, None))[0]
    api("PUT", f"/rest/api/3/issue/{a.key}/assignee", {"accountId": aid})
    print(f"{a.key} 담당 → {a.who}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("ls"); p.add_argument("--jql"); p.add_argument("--mine", action="store_true")
    p.add_argument("--open", action="store_true"); p.set_defaults(fn=cmd_ls)
    p = sub.add_parser("whoami"); p.set_defaults(fn=cmd_whoami)
    p = sub.add_parser("view"); p.add_argument("key"); p.set_defaults(fn=cmd_view)
    p = sub.add_parser("create"); p.add_argument("--who", choices=list(PEOPLE) + ["none"], default="sumin")
    p.add_argument("--title", required=True); p.add_argument("--body-file"); p.add_argument("--labels")
    p.add_argument("--due"); p.set_defaults(fn=cmd_create)
    p = sub.add_parser("move"); p.add_argument("key"); p.add_argument("to", choices=list(STATUS))
    p.set_defaults(fn=cmd_move)
    p = sub.add_parser("comment"); p.add_argument("key"); p.add_argument("--body"); p.add_argument("--body-file")
    p.set_defaults(fn=cmd_comment)
    p = sub.add_parser("assign"); p.add_argument("key"); p.add_argument("who", choices=list(PEOPLE) + ["none"])
    p.set_defaults(fn=cmd_assign)

    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
