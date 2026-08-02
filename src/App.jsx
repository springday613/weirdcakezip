import { useState } from "react";
import { orders } from "./data/orders.js";
import { judge } from "./judgeClient.js";
import { coinsFor } from "./scoreCake.js";
import TitleScreen from "./screens/TitleScreen.jsx";
import OrderScreen from "./screens/OrderScreen.jsx";
import ResultScreen from "./screens/ResultScreen.jsx";
import Hud from "./components/Hud.jsx";

// 게임 루프 = 상태머신 (척추 = 이 하나의 상태 객체)
//   TITLE → PLAYING(orderIndex) → RESULT(orderIndex) → 다음 or END
const emptyCake = () => ({
  base: [],
  sheetColor: null,
  cream: null,
  toppings: [],
  deco: [],
  lettering: { text: "", color: null },
});

const BG_MODES = ["solid", "day", "night"];
const BG_LABELS = { solid: "단색", day: "낮", night: "밤" };

export default function App() {
  const [screen, setScreen] = useState("TITLE"); // TITLE | PLAYING | RESULT | END
  const [orderIndex, setOrderIndex] = useState(0);
  const [cake, setCake] = useState(emptyCake());
  const [result, setResult] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [money, setMoney] = useState(0);
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState(0); // 이번 손님에게 던진 질문 수 — 점수에서 지불한다
  const [bgMode, setBgMode] = useState(0); // 개발용 배경 토글

  const order = orders[orderIndex];

  function start() {
    setOrderIndex(0);
    setCake(emptyCake());
    setTotalScore(0);
    setMoney(0);
    setTurns(0);
    setScreen("PLAYING");
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

  // 개발용: 스테이지 점프 — 순차 진행 없이 특정 손님으로 바로
  function jumpTo(i) {
    setOrderIndex(i);
    setCake(emptyCake());
    setResult(null);
    setTurns(0);
    setScreen("PLAYING");
  }

  function next() {
    const ni = orderIndex + 1;
    if (ni >= orders.length) {
      setScreen("END");
      return;
    }
    setOrderIndex(ni);
    setCake(emptyCake());
    setResult(null);
    setTurns(0); // 예산은 손님마다 새로 준다
    setScreen("PLAYING");
  }

  const bgClass = `bg-${BG_MODES[bgMode]}`;

  return (
    <div className={`app-shell ${bgClass}`}>
      {/* ① 배경 그림 (교체 예정) */}
      <div className="layer-art" />

      {/* 배경 위 베일 — 어두운 배경에서도 UI가 읽히게 */}
      <div className="layer-veil" />

      {/* ② 패널·카드·스와치 원·노드 원 */}
      <div className="layer-frame" />

      {/* ③ 에셋 PNG (케이크·재료·괴물) */}
      <div className="layer-asset" />

      {/* ④ 글자·버튼·아이콘·베일·딤 */}
      <div className="layer-ui">
        {screen !== "TITLE" && (
          <Hud hearts={5} coins={money} />
        )}

        {screen === "TITLE" && <TitleScreen onStart={start} />}

        {screen === "PLAYING" && (
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
            onAsk={() => setTurns((n) => n + 1)}
          />
        )}

        {screen === "RESULT" && (
          <ResultScreen result={result} order={order} cake={cake} onNext={next} />
        )}

        {screen === "END" && (
          <div className="screen center">
            <h1>영업 종료</h1>
            <p className="big">오늘 매출 {money.toLocaleString()}코인</p>
            <p className="hint">총점 {totalScore}점</p>
            <button className="btn" onClick={start}>
              다시 하기
            </button>
          </div>
        )}
      </div>

      {/* 개발용 배경 토글 — 프로덕션에서 숨김 */}
      {import.meta.env.DEV && (
        <button
          className="dev-bg-toggle"
          onClick={() => setBgMode((m) => (m + 1) % BG_MODES.length)}
        >
          BG: {BG_LABELS[BG_MODES[bgMode]]}
        </button>
      )}

      {/* 개발용 스테이지 점프 — 번호 클릭으로 해당 손님 바로 시작 */}
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
