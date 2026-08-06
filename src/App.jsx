import { useState, useRef, useCallback } from "react";
import { orders } from "./data/orders.js";
import { judge } from "./judgeClient.js";
import { chat } from "./chatClient.js";
import { coinsFor, starsFor, EXTRA_TURN_BUNDLE, extraTurnPrice } from "./scoreCake.js";
import TitleScreen from "./screens/TitleScreen.jsx";
import NameScreen from "./screens/NameScreen.jsx";
import TutorialEndScreen from "./screens/TutorialEndScreen.jsx";
import StoryScreen from "./screens/StoryScreen.jsx";
import StageMapScreen from "./screens/StageMapScreen.jsx";
import ChatScreen from "./screens/ChatScreen.jsx";
import OrderScreen from "./screens/OrderScreen.jsx";
import ResultScreen from "./screens/ResultScreen.jsx";
import ConfirmScreen from "./screens/ConfirmScreen.jsx";
import StageClearScreen from "./screens/StageClearScreen.jsx";
import LoadingScreen, { useLoading } from "./screens/LoadingScreen.jsx";
import Hud from "./components/Hud.jsx";
import ChatPopup from "./components/ChatPopup.jsx";
import { MONSTERS } from "./data/ingredients.js";
import { STORY, GOOD_ENDING_COINS } from "./data/story.js";
import { TUTORIAL_GUIDE } from "./data/tutorial.js";
import { soundManager } from "./utils/soundManager.js";
import { starAnimEnd } from "./components/Stars.jsx";
import useSfx from "./useSfx.js";

// 게임 루프 = 상태머신
//   TITLE → NAME(이름) → INTRO(스토리) → STAGE → CHAT → BUILD → RESULT → STAGE 순환
//   → 코인 목표(GOOD_ENDING_COINS) 달성 또는 5명 완료 시: END(정산) → ENDING(스토리) → CREDITS
const emptyCake = () => ({
  base: [],
  cakeBase: "vanilla", // 기본 선택 — 튜토리얼에서 유일하게 열린 맛이기도 하다
  cream: null,
  toppings: [],
  deco: [],
  lettering: { text: "", color: null },
});

const BG_MODES = ["solid", "day", "night"];
const BG_LABELS = { solid: "단색", day: "낮", night: "밤" };

export default function App() {
  const [screen, setScreen] = useState("TITLE"); // TITLE | NAME | INTRO | STAGE | CHAT | BUILD | CONFIRM | RESULT | END | ENDING | CREDITS
  const [playerName, setPlayerName] = useState(""); // 스토리 주인공 이름 (NAME 화면에서 받는다)
  const [devEnding, setDevEnding] = useState(null); // 개발용 엔딩 강제("good"|"bad") — 실플레이는 null
  const [cheered, setCheered] = useState(false); // 크레딧 CTA(합격시키기) 눌렀는가
  const [orderIndex, setOrderIndex] = useState(0);
  const [cake, setCake] = useState(emptyCake());
  const [result, setResult] = useState(null);
  const [money, setMoney] = useState(0);
  const [chatBusy, setChatBusy] = useState(false);
  const [judgeBusy, setJudgeBusy] = useState(false);
  const [turns, setTurns] = useState(0);
  const [extraTurns, setExtraTurns] = useState(0);
  const [bgMode, setBgMode] = useState(0);
  const [messages, setMessages] = useState([]); // 대화 기록 — 화면 전환에도 유지
  const [scriptIdx, setScriptIdx] = useState(0); // 대본 진행도 — ChatBox 와 동기
  const [chatPopupOpen, setChatPopupOpen] = useState(false);
  const nextMsgId = useRef(1);
  const scriptAdvancing = useRef(false); // 대본 연타 가드
  const { muted, toggleMute } = useSfx();

  // A2: 버튼·재료 칩 탭 — 이벤트 위임으로 전부.
  // data-sfx 가 있는 버튼은 자체 사운드가 있으므로 A2를 건너뛴다 (가게 열기 = A1).
  const handleGlobalClick = useCallback((e) => {
    const btn = e.target.closest("button");
    if (btn && !btn.dataset.sfx) {
      soundManager.playSfx("tap", { vary: true });
    }
  }, []);

  // 손님별 최고 별점. 인덱스 = orders 배열 순서. 0 = 아직 안 함
  const [stars, setStars] = useState(() => orders.map(() => 0));
  // 손님별 수익 적립 여부 — 재플레이 판정을 별점이 아니라 이걸로 한다.
  // 별점 기준이면 다시하기(retry)로 적립을 되돌린 뒤 재제출해도 수익 0 이 되어 버린다.
  const [collected, setCollected] = useState(() => orders.map(() => false));

  // 로딩 오버레이
  const { loading, loadMsg, withLoading } = useLoading();

  const order = orders[orderIndex];
  const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;

  // 손님 시드 — 최초 주문 대사로 대화 시작
  function seedMessages(o) {
    nextMsgId.current = 1;
    setMessages([{ id: 0, role: "monster", content: o.dialogue }]);
    setScriptIdx(0);
  }

  function start() {
    // A1 시작음은 TitleScreen의 mousedown에서 이미 재생됨
    // 화면 전환은 소리가 들린 뒤 넘어가도록 살짝 딜레이
    setTimeout(() => soundManager.playBgm(), 600);
    setOrderIndex(0);
    setCake(emptyCake());
    setMoney(0);
    setTurns(0);
    setExtraTurns(0);
    setStars(orders.map(() => 0));
    setCollected(orders.map(() => false));
    setCheered(false);
    setDevEnding(null);
    setTimeout(() => setScreen("NAME"), 180); // 소리 후 화면 전환
  }

  // 스테이지 맵에서 노드 선택
  function selectNode(i) {
    setOrderIndex(i);
    setCake(emptyCake());
    setResult(null);
    setTurns(0);
    setExtraTurns(0);
    seedMessages(orders[i]);
    withLoading("손님이 오고 있어요…", async () => {}).then(() => {
      setScreen("CHAT");
    });
  }

  async function submit() {
    let starValue = 0;
    await withLoading("케이크 채점 중…", async () => {
      setJudgeBusy(true);
      const r = await judge(order.id, cake, turns);
      setJudgeBusy(false);
      // ⚠ 임시 — 재플레이 수익 0. 최종 정책은 8/4 미팅 (재수익 0 vs 최고 기록 초과분만)
      // 지금 안 막으면 완료 노드 반복으로 코인 무한 파밍 → S19 의 엔딩 조건이 무력화된다
      const isReplay = collected[orderIndex];
      const earned = isReplay ? 0 : coinsFor(r.score);
      setResult({ ...r, earned, counted: !isReplay }); // counted = 이번 판이 실제로 적립됐는가
      if (!isReplay) {
        setMoney((m) => m + earned);
        setCollected((prev) => {
          const next = [...prev];
          next[orderIndex] = true;
          return next;
        });
      }
      // 별점 갱신 — 기존보다 높을 때만 (재플레이도 갱신)
      starValue = starsFor(r.score);
      setStars((prev) => {
        const next = [...prev];
        if (starValue > next[orderIndex]) next[orderIndex] = starValue;
        return next;
      });
    });
    setScreen("RESULT");
    // A4: 별점 애니메이션이 끝난 뒤 보상음
    setTimeout(() => soundManager.playSfx("reward"), starAnimEnd(starValue));
  }

  // 완성 확인 화면으로 — 튜토리얼(order.script)은 치트 시트가 정답을 알려주므로 건너뛴다.
  // submit() 내부는 건드리지 않는다. 호출 지점만 옮긴다.
  function toConfirm() {
    if (order.script) return submit();
    setScreen("CONFIRM");
  }

  // 대본 진행 — ChatBox 에서 호출. 연타 가드로 같은 대사 중복 방지.
  function advanceScript() {
    const script = order.script;
    if (!script || scriptIdx >= script.length) return;
    if (scriptAdvancing.current) return; // 연타 방어
    scriptAdvancing.current = true;
    const { ask, reply } = script[scriptIdx];
    setMessages((m) => [
      ...m,
      { id: nextMsgId.current++, role: "user", content: ask },
      { id: nextMsgId.current++, role: "monster", content: reply },
    ]);
    setScriptIdx((n) => n + 1);
    // 다음 렌더 후 해제
    requestAnimationFrame(() => { scriptAdvancing.current = false; });
  }

  // 대화 보내기 — ChatBox 에서 호출. 일반 대화만 (chatBusy)
  async function handleSend(text) {
    const userMsg = { id: nextMsgId.current++, role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setChatBusy(true);
    const { reply, raw } = await chat(order.id, next);
    setChatBusy(false);
    setMessages((m) => [...m, { id: nextMsgId.current++, role: "monster", content: reply, raw }]);
  }

  // 개발용: 스테이지 점프
  function jumpTo(i) {
    setOrderIndex(i);
    setCake(emptyCake());
    setResult(null);
    setTurns(0);
    setExtraTurns(0);
    seedMessages(orders[i]);
    setScreen("CHAT");
  }

  function next() {
    // 코인 목표를 모으면 귀환 주문 완성 — 엔딩으로. 5명을 다 돌고도 못 모았으면 배드 엔딩.
    // (재플레이 수익 0 이라 5명 완료 후엔 더 벌 수 없다)
    const allDone = stars.every((v) => v > 0);
    if (money >= GOOD_ENDING_COINS || allDone) {
      setDevEnding(null); // 실플레이 엔딩은 코인으로만 가른다
      setScreen("END"); // 영업 종료(정산) → 엔딩 스토리
      return;
    }
    setScreen("STAGE");
  }

  // 튜토리얼 건너뛰기 — 노드 T 를 ★1 완료로 표시해 레벨 1 을 열고 맵으로.
  // 수익·적립은 없다(collected 유지) — 나중에 튜토리얼을 플레이하면 코인은 그대로 벌 수 있다.
  function skipTutorial() {
    setStars((prev) => {
      if (prev[0] > 0) return prev;
      const next = [...prev];
      next[0] = 1;
      return next;
    });
    setScreen("STAGE");
  }

  // 다시하기 — 이번 채점의 점수·코인을 물리고 같은 손님의 제작으로 돌아간다.
  // 대화 기록과 질문 수(감점)는 유지 — 재도전이 공짜 정보가 되지 않게.
  function retry() {
    // 이번 판이 적립된 경우만 되돌린다 — 재플레이 판(수익 0)을 또 빼면 총점이 왜곡된다
    if (result?.counted) {
      setMoney((m) => m - result.earned);
      setCollected((prev) => {
        const next = [...prev];
        next[orderIndex] = false;
        return next;
      });
    }
    setResult(null);
    setScreen("BUILD");
  }

  const buyTurn = () => {
    const price = extraTurnPrice(extraTurns);
    if (price != null && money >= price) {
      setMoney((m) => m - price);
      setExtraTurns((n) => n + EXTRA_TURN_BUNDLE);
    }
  };

  const bgClass = `bg-${BG_MODES[bgMode]}`;

  return (
    <div className={`app-shell ${bgClass}`} onClick={handleGlobalClick}>
      <div className="layer-art" />
      <div className="layer-veil" />

      {/* 게임 진행 화면들엔 기본 배경(구름 하늘) — CHAT 상단은 ChatScreen 이 가게 배경을 얹고,
          BUILD 는 작업대·앞치마 배경으로 통째로 갈아입는다(S25) */}
      {["STAGE", "CHAT", "BUILD", "CONFIRM", "RESULT", "END"].includes(screen) && (
        <div className={`screen-bg${screen === "BUILD" ? " screen-bg--build" : ""}`} />
      )}

      {/* HUD — 타이틀·이름·스토리·에필로그 이외 화면에 상주 */}
      {!["TITLE", "NAME", "INTRO", "ENDING", "CREDITS", "TUTEND"].includes(screen) && (
        <div className="layer-ui layer-ui--hud">
          <Hud coins={money} muted={muted} onToggleMute={toggleMute}>
            <div className="hud-left-col">
              {screen === "BUILD" && (
                <button className="btn-ghost chat-popup-trigger" onClick={() => setChatPopupOpen(true)}>
                  <img className="bubble-face chat-trigger-face" src={monster.img.normal} alt="" />
                  대화
                </button>
              )}
              {/* 튜토리얼 건너뛰기 — 왼쪽 상단, 제작 중엔 대화 버튼 아래 */}
              {order.script && ["CHAT", "BUILD"].includes(screen) && (
                <button className="chip ghost tut-skip" onClick={skipTutorial}>
                  튜토리얼 건너뛰기
                </button>
              )}
            </div>
          </Hud>
        </div>
      )}

      {screen === "TITLE" && <TitleScreen onStart={start} />}

      {screen === "NAME" && (
        <div className="layer-ui story-layer">
          <NameScreen
            onDone={(n) => {
              setPlayerName(n);
              setScreen("INTRO");
            }}
          />
        </div>
      )}

      {screen === "INTRO" && (
        <div className="layer-ui story-layer">
          {/* 인트로 직후엔 맵을 거치지 않고 튜토리얼로 바로 — 첫 손님(핑크)이 이미 문을 열고 들어왔다 */}
          <StoryScreen
            cuts={STORY.begin}
            name={playerName}
            onDone={() => (stars[0] > 0 ? setScreen("STAGE") : selectNode(0))}
          />
        </div>
      )}

      {screen === "ENDING" && (
        <div className="layer-ui story-layer">
          <StoryScreen
            cuts={
              (devEnding ?? (money >= GOOD_ENDING_COINS ? "good" : "bad")) === "good"
                ? STORY.endGood
                : STORY.endBad
            }
            name={playerName}
            money={money}
            onDone={() => setScreen("CREDITS")}
          />
        </div>
      )}

      {screen === "STAGE" && (
        <StageMapScreen stars={stars} onSelect={selectNode} />
      )}

      {screen === "CHAT" && (
        <ChatScreen
          key={order.id}
          order={order}
          messages={messages}
          onSend={handleSend}
          busy={chatBusy}
          turns={turns}
          extraTurns={extraTurns}
          money={money}
          onAsk={() => setTurns((n) => n + 1)}
          onBuyTurn={buyTurn}
          onMake={() => setScreen("BUILD")}
          scriptIdx={scriptIdx}
          onAdvanceScript={advanceScript}
        />
      )}

      {/* BUILD+CONFIRM — OrderScreen 을 계속 마운트해 step/made 보존 */}
      {["BUILD", "CONFIRM"].includes(screen) && (
        <div className="layer-ui layer-ui--grow">
          <div className="build-keep" style={screen === "CONFIRM" ? { display: "none" } : undefined}>
            <OrderScreen
              key={order.id}
              order={order}
              index={orderIndex}
              total={orders.length}
              cake={cake}
              setCake={setCake}
              onSubmit={toConfirm}
              busy={judgeBusy}
            />
          </div>
          {screen === "CONFIRM" && (
            <ConfirmScreen
              order={order}
              cake={cake}
              onBack={() => setScreen("BUILD")}
              onSubmit={submit}
              busy={judgeBusy}
            />
          )}
          {chatPopupOpen && (
            <ChatPopup
              order={order}
              messages={messages}
              onSend={handleSend}
              busy={chatBusy}
              turns={turns}
              extraTurns={extraTurns}
              money={money}
              onAsk={() => setTurns((n) => n + 1)}
              onBuyTurn={buyTurn}
              onClose={() => setChatPopupOpen(false)}
              scriptIdx={scriptIdx}
              onAdvanceScript={advanceScript}
            />
          )}
        </div>
      )}

      {screen === "RESULT" && (
        <div className="layer-ui layer-ui--grow">
          <ResultScreen
            result={result}
            order={order}
            cake={cake}
            onNext={order.id === TUTORIAL_GUIDE.orderId ? () => setScreen("TUTEND") : next}
            onRetry={retry}
          />
        </div>
      )}

      {/* 튜토리얼 에필로그 — 물범이 감점 제도를 알려주고 다음으로 */}
      {screen === "TUTEND" && (
        <div className="layer-ui tutend-layer">
          <TutorialEndScreen name={playerName || undefined} onDone={next} />
        </div>
      )}

      {screen === "END" && (
        <div className="layer-ui layer-ui--grow">
          <StageClearScreen
            stars={stars}
            money={money}
            onEnding={() => setScreen("ENDING")}
            onRestart={start}
          />
        </div>
      )}

      {/* 엔딩 크레딧 — 아웃트로 뒤, 배경 위에 주인공과 CTA */}
      {screen === "CREDITS" && (
        <div className="layer-ui story-layer">
          <div className="credits">
            <img className="credits-char" src="/assets/story_user_full.webp" alt="주인공" />
            <p className="credits-q">{playerName || "주인공"}의 앞으로의 여정이 궁금하다면?</p>
            {cheered ? (
              <p className="credits-thanks">감사합니다! 뭉게뭉게 마을에서 기다릴게요 🍰</p>
            ) : (
              <button className="btn" onClick={() => setCheered(true)}>
                프롬프트 파티시에 팀 합격시키기
              </button>
            )}
            <button className="chip ghost" onClick={start}>처음부터 다시 하기</button>
          </div>
        </div>
      )}

      {/* 로딩 오버레이 — 화면 위에 얹는다 */}
      {loading && <LoadingScreen visible={loading} message={loadMsg} />}

      {/* 개발용 배경 토글 */}
      {import.meta.env.DEV && (
        <button
          className="dev-bg-toggle"
          onClick={() => setBgMode((m) => (m + 1) % BG_MODES.length)}
        >
          BG: {BG_LABELS[BG_MODES[bgMode]]}
        </button>
      )}

      {/* 개발용 스테이지 점프 — in(인트로)·굿/배드(엔딩 강제) 포함 */}
      {import.meta.env.DEV && (
        <div className="dev-stage-jump">
          <button
            className={screen === "INTRO" ? "on" : ""}
            title="인트로 스토리"
            onClick={() => {
              if (!playerName) setPlayerName("달콤한체리"); // 이름 없이 점프해도 대사가 깨지지 않게
              setScreen("INTRO");
            }}
          >
            in
          </button>
          <button
            className={screen === "STAGE" ? "on" : ""}
            title="스테이지 맵"
            onClick={() => setScreen("STAGE")}
          >
            맵
          </button>
          {orders.map((o, i) => (
            <button
              key={o.id}
              className={i === orderIndex && screen !== "TITLE" ? "on" : ""}
              title={o.id + " · " + o.monster}
              onClick={() => jumpTo(i)}
            >
              {i === 0 ? "T" : i}
            </button>
          ))}
          <button
            className={screen === "ENDING" && devEnding === "good" ? "on" : ""}
            title="굿 엔딩 스토리"
            onClick={() => {
              if (!playerName) setPlayerName("달콤한체리");
              setDevEnding("good");
              setScreen("ENDING");
            }}
          >
            굿
          </button>
          <button
            className={screen === "ENDING" && devEnding === "bad" ? "on" : ""}
            title="배드 엔딩 스토리"
            onClick={() => {
              if (!playerName) setPlayerName("달콤한체리");
              setDevEnding("bad");
              setScreen("ENDING");
            }}
          >
            배드
          </button>
        </div>
      )}
    </div>
  );
}
