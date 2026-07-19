import { useState } from "react";
import { orders } from "./data/orders.js";
import { judge } from "./judgeClient.js";
import { coinsFor } from "./scoreCake.js";
import TitleScreen from "./screens/TitleScreen.jsx";
import OrderScreen from "./screens/OrderScreen.jsx";
import ResultScreen from "./screens/ResultScreen.jsx";

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

export default function App() {
  const [screen, setScreen] = useState("TITLE"); // TITLE | PLAYING | RESULT | END
  const [orderIndex, setOrderIndex] = useState(0);
  const [cake, setCake] = useState(emptyCake());
  const [result, setResult] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [money, setMoney] = useState(0); // 누적 수익(원)
  const [busy, setBusy] = useState(false);

  const order = orders[orderIndex];

  function start() {
    setOrderIndex(0);
    setCake(emptyCake());
    setTotalScore(0);
    setMoney(0);
    setScreen("PLAYING");
  }

  async function submit() {
    setBusy(true);
    const r = await judge(order.id, cake);
    setBusy(false);
    const earned = coinsFor(r.score);
    setResult({ ...r, earned });
    setTotalScore((s) => s + r.score);
    setMoney((m) => m + earned);
    setScreen("RESULT");
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
    setScreen("PLAYING");
  }

  return (
    <div className="app">
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
        />
      )}

      {screen === "RESULT" && (
        <ResultScreen result={result} order={order} cake={cake} onNext={next} />
      )}

      {screen === "END" && (
        <div className="screen center">
          <h1>영업 종료 🎂</h1>
          <p className="big">💰 오늘 매출 {money.toLocaleString()}원</p>
          <p className="hint">총점 {totalScore}점</p>
          <button className="btn" onClick={start}>
            다시 하기
          </button>
        </div>
      )}
    </div>
  );
}
