import { useState } from "react";
import { orders } from "./data/orders.js";
import { judge } from "./judgeClient.js";
import { coinsFor, starsFor, EXTRA_TURN_BUNDLE, extraTurnPrice } from "./scoreCake.js";
import TitleScreen from "./screens/TitleScreen.jsx";
import StageMapScreen from "./screens/StageMapScreen.jsx";
import OrderScreen from "./screens/OrderScreen.jsx";
import ResultScreen from "./screens/ResultScreen.jsx";
import LoadingScreen, { useLoading } from "./screens/LoadingScreen.jsx";
import Hud from "./components/Hud.jsx";

// 게임 루프 = 상태머신
//   TITLE → STAGE → PLAYING → RESULT → STAGE (또는 END)
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
  const [screen, setScreen] = useState("TITLE"); // TITLE | STAGE | PLAYING | RESULT | END
  const [orderIndex, setOrderIndex] = useState(0);
  const [cake, setCake] = useState(emptyCake());
  const [result, setResult] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [money, setMoney] = useState(0);
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState(0);
  const [extraTurns, setExtraTurns] = useState(0);
  const [bgMode, setBgMode] = useState(0);

  // 손님별 최고 별점. 인덱스 = orders 배열 순서. 0 = 아직 안 함
  const [stars, setStars] = useState(() => orders.map(() => 0));

  // 로딩 오버레이
  const { loading, loadMsg, withLoading } = useLoading();

  const order = orders[orderIndex];

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
    withLoading("손님이 오고 있어요…", async () => {}).then(() => {
      setScreen("PLAYING");
    });
  }

  async function submit() {
    await withLoading("케이크 채점 중…", async () => {
      setBusy(true);
      const r = await judge(order.id, cake, turns);
      setBusy(false);
      const earned = coinsFor(r.score);
      setResult({ ...r, earned });
      setTotalScore((s) => s + r.score);
      setMoney((m) => m + earned);
      // 별점 갱신 — 기존보다 높을 때만
      const newStars = starsFor(r.score);
      setStars((prev) => {
        const next = [...prev];
        if (newStars > next[orderIndex]) next[orderIndex] = newStars;
        return next;
      });
    });
    setScreen("RESULT");
  }

  // 개발용: 스테이지 점프
  function jumpTo(i) {
    setOrderIndex(i);
    setCake(emptyCake());
    setResult(null);
    setTurns(0);
    setExtraTurns(0);
    setScreen("PLAYING");
  }

  function next() {
    // 정산 후 스테이지 맵으로 돌아간다
    setScreen("STAGE");
  }

  const bgClass = `bg-${BG_MODES[bgMode]}`;

  return (
    <div className={`app-shell ${bgClass}`}>
      <div className="layer-art" />
      <div className="layer-veil" />

      {/* HUD — 타이틀 이외 화면에 상주 */}
      {screen !== "TITLE" && (
        <div className="layer-ui"><Hud coins={money} /></div>
      )}

      {screen === "TITLE" && <TitleScreen onStart={start} />}

      {screen === "STAGE" && (
        <StageMapScreen stars={stars} onSelect={selectNode} />
      )}

      {screen === "PLAYING" && (
        <div className="layer-ui">
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
            turns={turns}
            extraTurns={extraTurns}
            onAsk={() => setTurns((n) => n + 1)}
            onBuyTurn={() => {
              const price = extraTurnPrice(extraTurns);
              if (price != null && money >= price) {
                setMoney((m) => m - price);
                setExtraTurns((n) => n + EXTRA_TURN_BUNDLE);
              }
            }}
          />
        </div>
      )}

      {screen === "RESULT" && (
        <div className="layer-ui">
          <ResultScreen result={result} order={order} cake={cake} onNext={next} />
        </div>
      )}

      {screen === "END" && (
        <div className="layer-ui">
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
