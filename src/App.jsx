import { useState, useRef } from "react";
import { orders } from "./data/orders.js";
import { judge } from "./judgeClient.js";
import { chat } from "./chatClient.js";
import { coinsFor, starsFor, EXTRA_TURN_BUNDLE, extraTurnPrice } from "./scoreCake.js";
import TitleScreen from "./screens/TitleScreen.jsx";
import TutorialEndScreen from "./screens/TutorialEndScreen.jsx";
import StageMapScreen from "./screens/StageMapScreen.jsx";
import ChatScreen from "./screens/ChatScreen.jsx";
import OrderScreen from "./screens/OrderScreen.jsx";
import ResultScreen from "./screens/ResultScreen.jsx";
import LoadingScreen, { useLoading } from "./screens/LoadingScreen.jsx";
import Hud from "./components/Hud.jsx";
import ChatPopup from "./components/ChatPopup.jsx";
import { MONSTERS } from "./data/ingredients.js";
import { TUTORIAL_GUIDE } from "./data/tutorial.js";

// 게임 루프 = 상태머신
//   TITLE → STAGE → CHAT → BUILD → RESULT → STAGE (또는 END)
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
  const [screen, setScreen] = useState("TITLE"); // TITLE | STAGE | CHAT | BUILD | RESULT | END
  const [orderIndex, setOrderIndex] = useState(0);
  const [cake, setCake] = useState(emptyCake());
  const [result, setResult] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
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

  // 손님별 최고 별점. 인덱스 = orders 배열 순서. 0 = 아직 안 함
  const [stars, setStars] = useState(() => orders.map(() => 0));

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
    setOrderIndex(0);
    setCake(emptyCake());
    setTotalScore(0);
    setMoney(0);
    setTurns(0);
    setExtraTurns(0);
    setStars(orders.map(() => 0));
    setScreen("STAGE");
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
    await withLoading("케이크 채점 중…", async () => {
      setJudgeBusy(true);
      const r = await judge(order.id, cake, turns);
      setJudgeBusy(false);
      // ⚠ 임시 — 재플레이 수익 0. 최종 정책은 8/4 미팅 (재수익 0 vs 최고 기록 초과분만)
      // 지금 안 막으면 완료 노드 반복으로 코인 무한 파밍 → S19 의 엔딩 조건이 무력화된다
      const isReplay = stars[orderIndex] > 0;
      const earned = isReplay ? 0 : coinsFor(r.score);
      setResult({ ...r, earned });
      if (!isReplay) {
        setTotalScore((s) => s + r.score);
        setMoney((m) => m + earned);
      }
      // 별점 갱신 — 기존보다 높을 때만 (재플레이도 갱신)
      const newStars = starsFor(r.score);
      setStars((prev) => {
        const next = [...prev];
        if (newStars > next[orderIndex]) next[orderIndex] = newStars;
        return next;
      });
    });
    setScreen("RESULT");
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
    // 정산 후 스테이지 맵으로 돌아간다
    setScreen("STAGE");
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
      <div className="layer-art" />
      <div className="layer-veil" />

      {/* 게임 진행 화면들엔 기본 배경(구름 하늘) — CHAT 상단은 ChatScreen 이 가게 배경을 얹는다 */}
      {["STAGE", "CHAT", "BUILD", "RESULT", "END"].includes(screen) && <div className="screen-bg" />}

      {/* HUD — 타이틀·에필로그 이외 화면에 상주 */}
      {!["TITLE", "TUTEND"].includes(screen) && (
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

      {screen === "TITLE" && <TitleScreen onStart={start} />}

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
            busy={judgeBusy}
          />
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
          />
        </div>
      )}

      {/* 튜토리얼 에필로그 — 물범이 감점 제도를 알려주고 스테이지 맵으로 */}
      {screen === "TUTEND" && (
        <div className="layer-ui tutend-layer">
          <TutorialEndScreen onDone={next} />
        </div>
      )}

      {screen === "END" && (
        <div className="layer-ui layer-ui--grow">
          <div className="screen center">
            <h1>영업 종료</h1>
            <p className="big">오늘 매출 {money.toLocaleString()}코인</p>
            <p className="hint">총점 {totalScore}점</p>
            <button className="btn" onClick={start}>
              다시 하기
            </button>
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

      {/* 개발용 스테이지 점프 */}
      {import.meta.env.DEV && (
        <div className="dev-stage-jump">
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
        </div>
      )}
    </div>
  );
}
