---
name: release-apk
description: |
  weirdcakezip 의 Android APK 를 빌드하고 GitHub Release 로 올린다 (제출용 "테스트 링크").
  사용 시점: "APK 뽑아줘" / "릴리즈 만들어줘" / "테스트 링크" / 제출 직전 빌드 갱신 /
  Capacitor 셸·아이콘·`capacitor.config.json` 을 고친 뒤.
  ⚠ 웹 코드만 바뀐 경우엔 APK 를 다시 만들 필요가 없다 — 원격 모드라 Vercel 재배포만으로 앱 내용이 갱신된다.
---

# release-apk — APK 빌드 + 릴리즈

제출 요건이 "플레이 가능한 빌드(웹 **또는** APK·테스트 링크)"라 APK 를 하나 유지한다.
S28 에서 손으로 조립했던 명령들(웹 빌드 → cap sync → gradle → Release 생성 → asset 업로드)을 한 줄로 묶은 것.

## 핵심 — 이 APK 는 "껍데기"다

`capacitor.config.json` 의 `server.url` 이 Vercel 프로덕션을 가리킨다. WebView 가 그 URL 을 **원격 로드**하므로:

- 게임 코드(`src/`)가 바뀌면 → **APK 재빌드 불필요.** Vercel 만 재배포하면 설치된 앱도 같이 바뀐다.
- 재빌드가 필요한 건 셸 쪽뿐 — 앱 이름·아이콘·권한·`server.url`·Capacitor 버전.
- 네트워크가 없으면 앱은 빈 화면이다(설계상 정상). LLM 대화가 온라인 전제라 어차피 오프라인은 성립하지 않는다.

## 준비 — 자격증명·툴체인

비밀값은 리포에 없다. 프로젝트 루트(리포 밖) `.env_cake` 에서 읽는다.

```bash
cd cake-shop && set -a && . ../.env_cake && set +a
python3 .claude/skills/release-apk/release.py doctor    # 항상 여기서 시작
```

| 환경변수 | 기본값 | 비고 |
|---|---|---|
| `GITHUB_TOKEN_CAKE` | (필수) | VanilaJelly PAT. `gh` CLI 계정(`summerdeneb-ops`)은 **쓰기 권한이 없다** |
| `JAVA_HOME` | 자동 탐색 | `java_home -v 21` → arm64/intel brew 순. ★ JDK 25 로는 gradle 이 안 돈다 |
| `ANDROID_HOME` | `~/Library/Android/sdk` | |
| `CAKE_REPO` | `springday613/weirdcakezip` | |

툴체인이 없으면(`doctor` 가 버전까지 확인해서 잡아준다):

```bash
brew install --cask android-commandlinetools && brew install openjdk@21
# 플랫폼 번호는 android/variables.gradle 의 compileSdkVersion 을 따른다 (현재 36)
yes | sdkmanager --sdk_root="$ANDROID_HOME" platform-tools 'platforms;android-36' 'build-tools;36.0.0'
```

## 명령

```bash
R=".claude/skills/release-apk/release.py"

python3 $R doctor                       # JDK 버전·SDK·토큰(실접속)·git 상태 점검
python3 $R build                        # npm build → cap sync → gradlew assembleDebug
python3 $R release --tag apk-v1.1       # Release 생성/갱신 + APK 업로드
python3 $R all --tag apk-v1.1           # 빌드부터 업로드까지 한 번에

python3 $R all --tag apk-v1.2 --notes-file /tmp/notes.md --latest
```

| 옵션 | 뜻 |
|---|---|
| `--tag` | (필수) `[A-Za-z0-9._-]`, 영숫자로 시작 |
| `--latest` / `--no-latest` | 정식 릴리즈 / prerelease. **안 주면 신규는 prerelease, 갱신은 기존 상태 유지** |
| `--name` | 릴리즈 제목 (기본 `이상한 케이크집 APK <tag>`) |
| `--notes-file` | 릴리즈 본문 md |
| `--allow-dirty` | 커밋 안 된 변경이 있어도 진행 |

- **릴리즈는 `HEAD` 커밋을 가리킨다** — 빌드한 코드와 릴리즈가 어긋나지 않게. 그래서 워킹트리가 더러우면 거부한다(`--allow-dirty` 로 우회). 이미 있는 태그는 GitHub 이 커밋을 못 바꾸므로 경고만 뜬다 — 새 커밋을 가리키려면 **새 태그**를 써라.
- `--latest` 는 sticky 하지 않게 명시적이다: 제출본을 latest 로 올려둔 뒤 같은 태그로 재빌드해도 **강등되지 않는다**(플래그를 안 주면 기존 상태 유지).
- 같은 태그로 다시 돌리면 본문을 갱신하고 **같은 이름 asset 을 지우고 다시 올린다**(안 지우면 업로드가 422 로 막힌다). 업로드가 중간에 끊겨도 같은 명령을 다시 치면 수렴한다.
- `all` 은 태그·notes 파일·토큰·git 상태를 **빌드 전에** 검증한다(3분 태우고 죽지 않게).
- 첫 gradle 빌드는 의존성 내려받느라 ~3분. 이후는 훨씬 빠르다.

## 함정 (겪은 것만)

- **JDK 25 불가** — `brew install openjdk@21`. 스킬이 자동 탐색해서 21 을 쓰지만(`doctor` 가 실제 `java -version` 을 확인한다), 손으로 gradle 을 부를 땐 `JAVA_HOME` 을 직접 넣어야 한다.
- **Apple Silicon 에뮬레이터**: `system-images;…;x86_64` 는 부팅 실패한다 → **arm64-v8a**. brew 판 `avdmanager` 가 `Package path is not valid` 로 죽으면 `~/.android/avd/<name>.ini` + `<name>.avd/config.ini` 를 손으로 써도 인식한다.
- **에뮬레이터에서 앱이 빈 화면/`ERR_NAME_NOT_RESOLVED`**: 게스트 네트워크 문제지 APK 문제가 아니다. `-dns-server 8.8.8.8` 로 재시작. **호스트에 VPN(`utun*`)이 떠 있으면** 게스트가 IPv4 기본 경로를 못 받아 그 무엇으로도 안 고쳐진다(라우트 수동 추가도 거부) → VPN 을 끄고 재시작.
- **다운로드 링크가 길어 터미널에서 잘린다** → 공유는 릴리즈 페이지 URL 로.
- iOS 는 APK 를 못 쓴다. 아이폰은 웹 URL → Safari → "홈 화면에 추가".

## 검증

에뮬레이터에 설치해 보는 게 가장 확실하다.

```bash
$ANDROID_HOME/emulator/emulator -avd cakeshop -dns-server 8.8.8.8 &
adb wait-for-device && adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.weirdcakezip.app/.MainActivity
adb exec-out screencap -p > /tmp/shot.png       # 타이틀이 뜨면 성공
```

관련: 위키 [게임 아키텍처](https://github.com/springday613/weirdcakezip/wiki/게임-아키텍처) 의 "제출용 패키징" 절 (Pages 트랙까지 포함). 리포 밖 프로젝트 폴더의 `memory/packaging-pages-apk.md` 에 함정이 더 정리돼 있다(수민 로컬).
