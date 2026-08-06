#!/usr/bin/env python3
"""weirdcakezip APK 빌드 + GitHub Release CLI.

APK 는 Capacitor **원격 모드**다 — 셸이 Vercel 프로덕션 URL 을 로드하므로,
번들을 다시 넣는 게 목적이 아니라 셸/아이콘/설정 변경을 굳히는 게 목적이다.
(웹 코드만 바뀐 경우 재빌드 없이 Vercel 재배포만으로 앱 내용이 갱신된다.)

인증: GitHub PAT. 값은 환경변수에서 읽는다 — 이 파일에 비밀값은 없다.
  GITHUB_TOKEN_CAKE  필수. VanilaJelly PAT (`.env_cake`)
  JAVA_HOME          선택. 기본 /usr/local/opt/openjdk@21   ★ 25 는 gradle 이 못 씀
  ANDROID_HOME       선택. 기본 ~/Library/Android/sdk
  CAKE_REPO          선택. 기본 springday613/weirdcakezip

  doctor                                 환경 점검 (여기서 먼저 막힌다)
  build                                  npm build → cap sync → gradle assembleDebug
  release --tag apk-v1.1 [--notes-file f] [--latest]   Release 생성/갱신 + APK 업로드
  all     --tag apk-v1.1 [...]           build + release
"""
import argparse, json, os, pathlib, re, subprocess, sys, urllib.error, urllib.request

REPO = os.environ.get("CAKE_REPO", "springday613/weirdcakezip")
JAVA_HOME = os.environ.get("JAVA_HOME") or "/usr/local/opt/openjdk@21"
ANDROID_HOME = os.environ.get("ANDROID_HOME") or os.path.expanduser("~/Library/Android/sdk")
ROOT = pathlib.Path(__file__).resolve().parents[3]          # …/cake-shop
APK = ROOT / "android/app/build/outputs/apk/debug/app-debug.apk"
ASSET_NAME = "weirdcakezip-debug.apk"


def die(msg, hint=""):
    print(f"✗ {msg}", file=sys.stderr)
    if hint:
        print(f"  → {hint}", file=sys.stderr)
    sys.exit(1)


def token():
    t = os.environ.get("GITHUB_TOKEN_CAKE")
    if not t:
        die("GITHUB_TOKEN_CAKE 없음", "cd cake-shop && set -a && . ../.env_cake && set +a")
    return t


def run(cmd, cwd=ROOT, env_extra=None):
    """서브프로세스 실행 — 실패하면 즉시 중단(부분 산출물로 릴리즈하는 사고 방지)."""
    env = {**os.environ, "JAVA_HOME": JAVA_HOME, "ANDROID_HOME": ANDROID_HOME,
           "PATH": f"{JAVA_HOME}/bin:" + os.environ.get("PATH", "")}
    if env_extra:
        env.update(env_extra)
    print(f"$ {' '.join(cmd)}")
    p = subprocess.run(cmd, cwd=str(cwd), env=env)
    if p.returncode != 0:
        die(f"실패: {' '.join(cmd)}")


def api(method, url, data=None, headers=None, raw=None, ctype=None):
    h = {"Authorization": f"token {token()}", "Accept": "application/vnd.github+json"}
    if headers:
        h.update(headers)
    body = raw if raw is not None else (json.dumps(data).encode() if data is not None else None)
    if ctype:
        h["Content-Type"] = ctype
    req = urllib.request.Request(url, data=body, headers=h, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:300]
        if e.code == 404 and method == "GET":
            return None
        die(f"GitHub {e.code} — {method} {url.split('?')[0]}", detail)


# ── 명령 ────────────────────────────────────────────────────────────────
def cmd_doctor(_a):
    ok = True
    jbin = pathlib.Path(JAVA_HOME) / "bin/java"
    print(f"JAVA_HOME      {JAVA_HOME}  {'✓' if jbin.exists() else '✗ 없음 → brew install openjdk@21'}")
    ok &= jbin.exists()
    for sub, hint in [("platform-tools", "platform-tools"),
                      ("build-tools", "'build-tools;35.0.0'"),
                      ("platforms", "'platforms;android-35'")]:
        p = pathlib.Path(ANDROID_HOME) / sub
        print(f"  {sub:15} {'✓' if p.exists() else '✗ → sdkmanager ' + hint}")
        ok &= p.exists()
    cfg = ROOT / "capacitor.config.json"
    if cfg.exists():
        url = json.loads(cfg.read_text()).get("server", {}).get("url", "(없음)")
        print(f"셸이 로드할 URL  {url}")
    else:
        print("✗ capacitor.config.json 없음"); ok = False
    print(f"토큰           {'✓' if os.environ.get('GITHUB_TOKEN_CAKE') else '✗ → . ../.env_cake'}")
    ok &= bool(os.environ.get("GITHUB_TOKEN_CAKE"))
    print(f"기존 APK       {APK if APK.exists() else '(아직 없음 — build 필요)'}")
    sys.exit(0 if ok else 1)


def cmd_build(_a):
    run(["npm", "run", "build"])
    run(["npx", "cap", "sync", "android"])
    run(["./gradlew", "assembleDebug"], cwd=ROOT / "android")
    if not APK.exists():
        die("gradle 은 성공했는데 APK 가 없다", str(APK))
    print(f"\n✓ APK {APK}  ({APK.stat().st_size / 1048576:.1f} MB)")


def cmd_release(a):
    if not APK.exists():
        die("APK 없음", "먼저 build 를 돌려라")
    tag = a.tag
    if not re.match(r"^[\w.\-]+$", tag):
        die(f"태그 형식이 이상하다: {tag}")

    notes = pathlib.Path(a.notes_file).read_text() if a.notes_file else DEFAULT_NOTES
    rel = api("GET", f"https://api.github.com/repos/{REPO}/releases/tags/{tag}")
    if rel:
        print(f"기존 릴리즈 갱신 {tag} (#{rel['id']})")
        rel = api("PATCH", f"https://api.github.com/repos/{REPO}/releases/{rel['id']}",
                  {"name": a.name or rel["name"], "body": notes, "prerelease": not a.latest})
    else:
        rel = api("POST", f"https://api.github.com/repos/{REPO}/releases",
                  {"tag_name": tag, "target_commitish": a.branch,
                   "name": a.name or f"이상한 케이크집 APK {tag}",
                   "body": notes, "draft": False, "prerelease": not a.latest})
        print(f"릴리즈 생성 {tag} (#{rel['id']})")

    # 같은 이름 asset 이 남아 있으면 업로드가 422 로 막힌다 — 먼저 지운다
    for asset in rel.get("assets", []):
        if asset["name"] == ASSET_NAME:
            api("DELETE", f"https://api.github.com/repos/{REPO}/releases/assets/{asset['id']}")
            print(f"기존 asset 삭제 ({asset['name']})")

    api("POST",
        f"https://uploads.github.com/repos/{REPO}/releases/{rel['id']}/assets?name={ASSET_NAME}",
        raw=APK.read_bytes(), ctype="application/vnd.android.package-archive")

    print(f"\n✓ 릴리즈 페이지 {rel['html_url']}")
    print(f"✓ 다운로드      https://github.com/{REPO}/releases/download/{tag}/{ASSET_NAME}")
    print("  (링크가 길어 터미널에서 잘릴 수 있다 — 공유는 릴리즈 페이지 쪽이 안전)")


def cmd_all(a):
    cmd_build(a)
    cmd_release(a)


DEFAULT_NOTES = """Android 테스트 빌드.

## 설치
1. 아래 Assets 에서 `weirdcakezip-debug.apk` 다운로드
2. Android 설정에서 '출처를 알 수 없는 앱 설치' 허용
3. 설치 후 실행 — **네트워크 필요** (원격 모드: 웹을 재배포하면 앱 내용도 같이 갱신된다)

debug 서명이라 Play 스토어 배포용이 아니다. iOS 는 APK 를 설치할 수 없다 — 아이폰은 웹 URL 을 Safari 로 열고 '홈 화면에 추가'.
"""


def main():
    ap = argparse.ArgumentParser(description="APK 빌드 + GitHub Release")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("doctor").set_defaults(fn=cmd_doctor)
    sub.add_parser("build").set_defaults(fn=cmd_build)
    for name, fn in [("release", cmd_release), ("all", cmd_all)]:
        p = sub.add_parser(name)
        p.add_argument("--tag", required=True, help="예: apk-v1.1")
        p.add_argument("--name", help="릴리즈 제목 (기본: 이상한 케이크집 APK <tag>)")
        p.add_argument("--notes-file", help="릴리즈 본문 md 파일")
        p.add_argument("--branch", default="main")
        p.add_argument("--latest", action="store_true", help="정식 릴리즈로 (기본은 prerelease)")
        p.set_defaults(fn=fn)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
