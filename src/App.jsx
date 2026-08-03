import { useState, useRef } from "react";
import { orders } from "./data/orders.js";
import { judge } from "./judgeClient.js";
import { chat } from "./chatClient.js";
import { coinsFor, EXTRA_TURN_BUNDLE, extraTurnPrice } from "./scoreCake.js";
import { MONSTERS } from "./data/ingredients.js";
import TitleScreen from "./screens/TitleScreen.jsx";
import NameScreen from "./screens/NameScreen.jsx";
import StoryScreen from "./screens/StoryScreen.jsx";
import ChatScreen from "./screens/ChatScreen.jsx";
import OrderScreen from "./screens/OrderScreen.jsx";
import ResultScreen from "./screens/ResultScreen.jsx";
import Hud from "./components/Hud.jsx";
import ChatPopup from "./components/ChatPopup.jsx";
import { STORY, GOOD_ENDING_COINS } from "./data/story.js";

// 게임 루프 = 상태머신 (척추 = 이 하나의 상태 객체)
//   TITLE → NAME → INTRO(스토리) → CHAT → BUILD → RESULT → 다음 or ENDING(스토리) → END
const emptyCake = () => ({
  base: [],
  cakeBase: null,
  cream: null,
  toppings: [],
  deco: [],
  lettering: { text: "", color: null },
});

const BG_MODES = ["solid", "day", "night"];
const BG_LABELS = { solid: "단색", day: "낮", night: "밤" };

export default function App() {
  const [screen, setScreen] = useState("TITLE"); // TITLE | NAME | INTRO | CHAT | BUILD | RESULT | END(정산) | ENDING(아웃트로) | CREDITS
  const [playerName, setPlayerName] = useState(""); // 스토리 주인공 이름 (NAME 화면에서 받는다)
  const [orderIndex, setOrderIndex] = useState(0);
  const [cake, setCake] = useState(emptyCake());
  const [result, setResult] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [money, setMoney] = useState(0);
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState(0); // 이번 손님에게 던진 질문 수 — 점수에서 지불한다
  const [extraTurns, setExtraTurns] = useState(0); // 코인으로 산 추가 질문(감점 없음, 상한 5)
  const [bgMode, setBgMode] = useState(0); // 개발용 배경 토글
  const [devEnding, setDevEnding] = useState(null); // 개발용 엔딩 강제("good"|"bad") — 실플레이는 null
  const [cheered, setCheered] = useState(false); // 크레딧 CTA(합격시키기) 눌렀는가
  const [messages, setMessages] = useState([]); // 대화 기록 — 화면 전환에도 유지
  const [scriptIdx, setScriptIdx] = useState(0); // 대본 진행도 — ChatBox 와 동기
  const [chatPopupOpen, setChatPopupOpen] = useState(false);
  const nextMsgId = useRef(1); // 메시지별 안정적 key

  const order = orders[orderIndex];
  const monster = MONSTERS[order.monster] ?? MONSTERS.cherry;

  // 손님 시드 — 최초 주문 대사로 대화 시작
  function seedMessages(o) {
    nextMsgId.current = 1;
    setMessages([{ id: 0, role: "monster", content: o.dialogue }]);
    setScriptIdx(0);
  }

  function start() {
    setOrderIndex(0);
    setCake(emptyCake());
    setTotalScore(0);
    setMoney(0);
    setTurns(0);
    setExtraTurns(0);
    setCheered(false);
    seedMessages(orders[0]);
    setScreen("NAME"); // 이름 → 인트로 스토리 → 첫 주문(CHAT). 스토리는 건너뛰기 가능
  }

  async function submit() {
    setBusy(true);
    const r = await judge(order.id, cake, turns);
    setBusy(false);
    const earned = coinsFor(r.score);
    setResult({ ...r, earned });
    setTotalScore((s) => s + r.score);
    setMoney((m) => m + earned);
    setScreen("RESULT");
  }

  // 대본 진행 — ChatBox 에서 호출
  function advanceScript() {
    const script = order.script;
    if (!script || scriptIdx >= script.length) return;
    const { ask, reply } = script[scriptIdx];
    setMessages((m) => [
      ...m,
      { id: nextMsgId.current++, role: "user", content: ask },
      { id: nextMsgId.current++, role: "monster", content: reply },
    ]);
    setScriptIdx((n) => n + 1);
  }

  // 대화 보내기 — ChatBox 에서 호출. 일반 대화만
  async function handleSend(text) {
    // 일반 대화 — LLM 호출
    const userMsg = { id: nextMsgId.current++, role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setBusy(true);
    const { reply, raw } = await chat(order.id, next);
    setBusy(false);
    setMessages((m) => [...m, { id: nextMsgId.current++, role: "monster", content: reply, raw }]);
  }

  // 개발용: 스테이지 점프 — 순차 진행 없이 특정 손님으로 바로
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
    const ni = orderIndex + 1;
    if (ni >= orders.length) {
      setDevEnding(null); // 실플레이 엔딩은 코인으로만 가른다
      setScreen("END"); // 영업 종료(정산) → 아웃트로 스토리 → 엔딩 화면
      return;
    }
    setOrderIndex(ni);
    setCake(emptyCake());
    setResult(null);
    setTurns(0);
    setExtraTurns(0); // 예산은 손님마다 새로 준다
    seedMessages(orders[ni]);
    setScreen("CHAT");
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
    <div className={`app-shell ${bgClass}`}>
      {/* ① 배경 그림 (교체 예정) */}
      <div className="layer-art" />

      {/* 배경 위 베일 — 어두운 배경에서도 UI가 읽히게 */}
      <div className="layer-veil" />

      {/* 게임 진행 화면들도 기본 배경(구름 하늘)을 깐다 — CHAT 상단은 ChatScreen 이 가게 배경을 얹는다 */}
      {["CHAT", "BUILD", "RESULT", "END"].includes(screen) && <div className="screen-bg" />}

      {/* HUD — 타이틀·이름·스토리 이외 화면에 상주하는 크롬 */}
      {!["TITLE", "NAME", "INTRO", "ENDING", "CREDITS"].includes(screen) && (
        <div className="layer-ui">
          <Hud coins={money}>
            {screen === "BUILD" && (
              <button className="btn-ghost chat-popup-trigger" onClick={() => setChatPopupOpen(true)}>
                <img className="bubble-face chat-trigger-face" src={monster.img.normal} alt="" />
                대화
              </button>
            )}
          </Hud>
        </div>
      )}

      {/* 화면이 필요한 층을 직접 렌더한다 (§2) */}
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
          <StoryScreen cuts={STORY.begin} name={playerName} onDone={() => setScreen("CHAT")} />
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

      {screen === "CHAT" && (
        <ChatScreen
          key={order.id}
          order={order}
          messages={messages}
          onSend={handleSend}
          busy={busy}
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

      {screen === "BUILD" && (
        <div className="layer-ui layer-ui--grow">
          <OrderScreen
            key={order.id}
            order={order}
            index={orderIndex}
            total={orders.length}
            money={money}
            cake={cake}
            setCake={setCake}
            onSubmit={submit}
            busy={busy}
          />
          {chatPopupOpen && (
            <ChatPopup
              order={order}
              messages={messages}
              onSend={handleSend}
              busy={busy}
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
          <ResultScreen result={result} order={order} cake={cake} onNext={next} />
        </div>
      )}

      {screen === "END" && (
        <div className="layer-ui layer-ui--grow">
          <div className="screen center">
            <h1>영업 종료</h1>
            <p className="big">오늘 매출 {money.toLocaleString()}코인</p>
            <p className="hint">총점 {totalScore}점</p>
            <button className="btn" onClick={() => setScreen("ENDING")}>
              엔딩 보기
            </button>
            <button className="chip ghost" onClick={start}>다시하기</button>
          </div>
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

      {/* 개발용 배경 토글 — 프로덕션에서 숨김 */}
      {import.meta.env.DEV && (
        <button
          className="dev-bg-toggle"
          onClick={() => setBgMode((m) => (m + 1) % BG_MODES.length)}
        >
          BG: {BG_LABELS[BG_MODES[bgMode]]}
        </button>
      )}

      {/* 개발용 스테이지 점프 — intro/outro 와 손님 번호로 바로 이동 */}
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
          {orders.map((o, i) => (
            <button
              key={o.id}
              className={i === orderIndex && !["TITLE", "INTRO", "ENDING"].includes(screen) ? "on" : ""}
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
