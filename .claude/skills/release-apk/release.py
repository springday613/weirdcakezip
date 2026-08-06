#!/usr/bin/env python3
"""weirdcakezip APK 빌드 + GitHub Release CLI.

APK 는 Capacitor **원격 모드**다 — 셸이 Vercel 프로덕션 URL 을 로드하므로,
번들을 다시 넣는 게 목적이 아니라 셸/아이콘/설정 변경을 굳히는 게 목적이다.
(웹 코드만 바뀐 경우 재빌드 없이 Vercel 재배포만으로 앱 내용이 갱신된다.)

인증: GitHub PAT. 값은 환경변수에서 읽는다 — 이 파일에 비밀값은 없다.
  GITHUB_TOKEN_CAKE  필수. VanilaJelly PAT (`.env_cake`)
  JAVA_HOME          선택. 없으면 JDK 21 을 자동 탐색한다  ★ 25 는 gradle 이 못 씀
  ANDROID_HOME       선택. 기본 ~/Library/Android/sdk
  CAKE_REPO          선택. 기본 springday613/weirdcakezip

  doctor                                 환경 점검 (여기서 먼저 막힌다)
  build                                  npm build → cap sync → gradle assembleDebug
  release --tag apk-v1.1 [옵션]          Release 생성/갱신 + APK 업로드
  all     --tag apk-v1.1 [옵션]          build + release

  옵션: --name "제목"  --notes-file f  --latest/--no-latest  --allow-dirty
"""
import argparse, json, os, pathlib, re, subprocess, sys, time, urllib.error, urllib.parse, urllib.request

REPO = os.environ.get("CAKE_REPO", "springday613/weirdcakezip")
ANDROID_HOME = os.environ.get("ANDROID_HOME") or os.path.expanduser("~/Library/Android/sdk")
ROOT = pathlib.Path(__file__).resolve().parents[3]          # …/cake-shop
APK = ROOT / "android/app/build/outputs/apk/debug/app-debug.apk"
ASSET_NAME = "weirdcakezip-debug.apk"
TAG_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$", re.ASCII)   # ★ ASCII — 유니코드 태그는 urllib 에서 크래시
TIMEOUT = 120


def die(msg, hint=""):
    print(f"✗ {msg}", file=sys.stderr)
    if hint:
        print(f"  → {hint}", file=sys.stderr)
    sys.exit(1)


def find_java():
    """JDK 21 탐색 — 경로 하드코딩 금지(AGENTS.md). 호출자 JAVA_HOME 이 21 이면 그걸 쓴다."""
    cands = []
    if os.environ.get("JAVA_HOME"):
        cands.append(os.environ["JAVA_HOME"])
    try:                                                     # macOS 표준 탐색기
        out = subprocess.run(["/usr/libexec/java_home", "-v", "21"],
                             capture_output=True, text=True, timeout=10)
        if out.returncode == 0:
            cands.append(out.stdout.strip())
    except Exception:
        pass
    cands += ["/opt/homebrew/opt/openjdk@21", "/usr/local/opt/openjdk@21"]  # arm64 / intel brew
    for c in cands:
        if c and java_major(c) in (17, 21):
            return c
    return cands[0] if cands else ""


def java_major(home):
    """해당 JDK 의 메이저 버전. 실행 못 하면 None — '있으니 ✓' 로 넘기지 않는다."""
    exe = pathlib.Path(home) / "bin/java"
    if not exe.exists():
        return None
    try:
        out = subprocess.run([str(exe), "-version"], capture_output=True, text=True, timeout=15)
        m = re.search(r'version "(\d+)', out.stderr + out.stdout)
        return int(m.group(1)) if m else None
    except Exception:
        return None


JAVA_HOME = find_java()


def compile_sdk():
    """android/variables.gradle 이 요구하는 SDK — 문서에 숫자를 박아두면 어긋난다."""
    f = ROOT / "android/variables.gradle"
    m = re.search(r"compileSdkVersion\s*=\s*(\d+)", f.read_text()) if f.exists() else None
    return int(m.group(1)) if m else None


def git(*args, check=True):
    p = subprocess.run(["git", *args], cwd=str(ROOT), capture_output=True, text=True)
    if check and p.returncode != 0:
        die(f"git {' '.join(args)} 실패", p.stderr.strip()[:200])
    return p.stdout.strip()


def run(cmd, cwd=ROOT):
    """서브프로세스 실행 — 실패하면 즉시 중단(부분 산출물로 릴리즈하는 사고 방지)."""
    env = {**os.environ, "JAVA_HOME": JAVA_HOME, "ANDROID_HOME": ANDROID_HOME,
           "PATH": f"{JAVA_HOME}/bin:" + os.environ.get("PATH", "")}
    print(f"$ {' '.join(cmd)}")
    if subprocess.run(cmd, cwd=str(cwd), env=env).returncode != 0:
        die(f"실패: {' '.join(cmd)}")


def token():
    t = os.environ.get("GITHUB_TOKEN_CAKE")
    if not t:
        die("GITHUB_TOKEN_CAKE 없음", "cd cake-shop && set -a && . ../.env_cake && set +a")
    return t


def api(method, url, data=None, raw=None, ctype=None, soft404=False):
    """soft404=True 인 GET 만 None 을 돌려준다. 나머지는 즉시 die."""
    h = {"Authorization": f"token {token()}", "Accept": "application/vnd.github+json"}
    if ctype:
        h["Content-Type"] = ctype
    body = raw if raw is not None else (json.dumps(data).encode() if data is not None else None)
    req = urllib.request.Request(url, data=body, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt else {}
    except urllib.error.HTTPError as e:
        if e.code == 404 and soft404:
            return None
        detail = e.read().decode()[:300]
        hint = f"리포·토큰 권한 확인: {REPO}" if e.code in (401, 403, 404) else ""
        die(f"GitHub {e.code} — {method} {url.split('?')[0]}\n  {detail}", hint)
    except (urllib.error.URLError, TimeoutError, OSError) as e:   # 네트워크 끊김·타임아웃
        die(f"네트워크 실패 — {method} {url.split('?')[0]}: {e}",
            "같은 명령을 다시 실행하면 이어서 복구된다(멱등)")


def check_repo():
    if api("GET", f"https://api.github.com/repos/{REPO}", soft404=True) is None:
        die(f"리포에 접근할 수 없다: {REPO}", "CAKE_REPO 오타이거나 토큰 권한이 없다")


def validate_tag(tag):
    if not TAG_RE.match(tag):
        die(f"태그 형식이 이상하다: {tag!r}", "영숫자로 시작, [A-Za-z0-9._-] 만 (예: apk-v1.1)")
    return urllib.parse.quote(tag, safe="")


# ── 명령 ────────────────────────────────────────────────────────────────
def cmd_doctor(_a):
    ok = True
    jm = java_major(JAVA_HOME)
    good_java = jm in (17, 21)
    print(f"JAVA_HOME      {JAVA_HOME or '(못 찾음)'}")
    print(f"  java 버전     {jm or '실행 불가'}  {'✓' if good_java else '✗ gradle 은 17/21 만 — brew install openjdk@21'}")
    ok &= good_java

    need = compile_sdk()
    print(f"ANDROID_HOME   {ANDROID_HOME}")
    for sub, want in [("platform-tools", None), ("build-tools", None),
                      ("platforms", f"android-{need}" if need else None)]:
        p = pathlib.Path(ANDROID_HOME) / sub / (want or "")
        hit = p.exists()
        label = f"{sub}/{want}" if want else sub
        pkg = f"'platforms;android-{need}'" if want else sub
        print(f"  {label:22} {'✓' if hit else f'✗ → sdkmanager {pkg}'}")
        ok &= hit

    cfg = ROOT / "capacitor.config.json"
    if cfg.exists():
        print(f"셸이 로드할 URL  {json.loads(cfg.read_text()).get('server', {}).get('url', '(없음)')}")
    else:
        print("✗ capacitor.config.json 없음"); ok = False

    if os.environ.get("GITHUB_TOKEN_CAKE"):
        check_repo()                                  # 존재만이 아니라 실제로 통하는지
        print(f"토큰           ✓ ({REPO} 접근 확인)")
    else:
        print("토큰           ✗ → set -a && . ../.env_cake && set +a"); ok = False

    print(f"git            {git('rev-parse', '--abbrev-ref', 'HEAD')} @ {git('rev-parse', '--short', 'HEAD')}"
          f"{'  ⚠ 워킹트리 더러움' if git('status', '--porcelain') else ''}")
    print(f"기존 APK       {APK if APK.exists() else '(아직 없음 — build 필요)'}")
    sys.exit(0 if ok else 1)


def cmd_build(_a):
    if not java_major(JAVA_HOME) in (17, 21):
        die(f"JDK 21 이 필요하다 (지금 {java_major(JAVA_HOME)})", "python3 …/release.py doctor")
    run(["npm", "run", "build"])
    run(["npx", "cap", "sync", "android"])
    run(["./gradlew", "assembleDebug"], cwd=ROOT / "android")
    if not APK.exists():
        die("gradle 은 성공했는데 APK 가 없다", str(APK))
    print(f"\n✓ APK {APK}  ({APK.stat().st_size / 1048576:.1f} MB)")


def preflight(a):
    """빌드 3분을 태우기 전에 죽을 이유를 먼저 찾는다."""
    validate_tag(a.tag)
    if a.notes_file and not pathlib.Path(a.notes_file).exists():
        die(f"notes 파일 없음: {a.notes_file}")
    check_repo()
    if git("status", "--porcelain") and not a.allow_dirty:
        die("워킹트리가 더럽다 — 커밋되지 않은 코드로 릴리즈를 만들면 "
            "릴리즈가 가리키는 커밋과 APK 내용이 어긋난다",
            "커밋하거나 --allow-dirty")


def cmd_release(a):
    if not APK.exists():
        die("APK 없음", "먼저 build 를 돌려라")
    preflight(a)
    tag_q = validate_tag(a.tag)
    sha, branch = git("rev-parse", "HEAD"), git("rev-parse", "--abbrev-ref", "HEAD")
    age = (time.time() - APK.stat().st_mtime) / 60
    print(f"릴리즈 대상  {branch} @ {sha[:9]}   APK {age:.0f}분 전 빌드"
          f"{'  ⚠ 오래됐다 — build 를 다시 돌릴지 확인' if age > 30 else ''}")

    notes = pathlib.Path(a.notes_file).read_text() if a.notes_file else DEFAULT_NOTES
    rel = api("GET", f"https://api.github.com/repos/{REPO}/releases/tags/{tag_q}", soft404=True)
    if rel:
        # ★ --latest 를 명시하지 않으면 기존 상태를 유지한다 (재실행에서 조용히 강등되던 문제)
        pre = rel["prerelease"] if a.latest is None else (not a.latest)
        if rel["target_commitish"] not in (sha, branch):
            print(f"⚠ 태그 {a.tag} 는 이미 존재한다 — 가리키는 커밋은 바꿀 수 없다"
                  f"(현재 {rel['target_commitish']}). 새 커밋을 가리키려면 새 태그를 써라.")
        rel = api("PATCH", f"https://api.github.com/repos/{REPO}/releases/{rel['id']}",
                  {"name": a.name or rel["name"] or f"이상한 케이크집 APK {a.tag}",
                   "body": notes, "prerelease": pre, "make_latest": str(not pre).lower()})
        print(f"기존 릴리즈 갱신 {a.tag} (prerelease={pre})")
    else:
        pre = True if a.latest is None else (not a.latest)
        rel = api("POST", f"https://api.github.com/repos/{REPO}/releases",
                  {"tag_name": a.tag, "target_commitish": sha,      # ★ 빌드한 그 커밋
                   "name": a.name or f"이상한 케이크집 APK {a.tag}",
                   "body": notes, "draft": False, "prerelease": pre,
                   "make_latest": str(not pre).lower()})
        print(f"릴리즈 생성 {a.tag} → {sha[:9]} (prerelease={pre})")

    # 같은 이름 asset 이 남아 있으면 업로드가 422 로 막힌다 — 먼저 지운다
    for asset in rel.get("assets", []):
        if asset["name"] == ASSET_NAME:
            api("DELETE", f"https://api.github.com/repos/{REPO}/releases/assets/{asset['id']}")
            print(f"기존 asset 삭제 ({asset['name']})")

    api("POST",
        f"https://uploads.github.com/repos/{REPO}/releases/{rel['id']}/assets?name={ASSET_NAME}",
        raw=APK.read_bytes(), ctype="application/vnd.android.package-archive")

    print(f"\n✓ 릴리즈 페이지 {rel['html_url']}")
    print(f"✓ 다운로드      https://github.com/{REPO}/releases/download/{a.tag}/{ASSET_NAME}")
    print("  공유는 릴리즈 페이지(또는 /releases/latest)가 안전 — 다운로드 링크는 터미널에서 잘린다")


def cmd_all(a):
    preflight(a)          # ★ 3분 빌드 전에 검증
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
        p.add_argument("--latest", action="store_true", default=None,
                       help="정식 릴리즈로 (기본: 신규는 prerelease, 갱신은 기존 상태 유지)")
        p.add_argument("--no-latest", dest="latest", action="store_false", help="prerelease 로 되돌린다")
        p.add_argument("--allow-dirty", action="store_true", help="커밋 안 된 변경이 있어도 진행")
        p.set_defaults(fn=fn)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
