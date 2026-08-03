import { useState } from "react";

// 튜토리얼 에필로그 (S21) — 채점 뒤, 물범이 케이크샵 위를 날며 감점 제도를 알려준다.
// TODO(S19 머지 후): name 을 플레이어 이름(playerName)과 연결한다.
const LINES = [
  "잘했어, {name}! 기대 이상인걸?",
  "이제 다음부터는 충분히 혼자 할 수 있을거야",
  "그런데.. 이제부터는 질문을 하나 할 때마다 조금씩 손님의 점수가 감점이 돼",
  "요구사항은 잘 알아내면서, 감점은 최소한도로 하면서 화이팅해봐!",
];

export default function TutorialEndScreen({ name = "주인님", onDone }) {
  const [i, setI] = useState(0);
  const next = () => (i + 1 < LINES.length ? setI(i + 1) : onDone());
  return (
    <div className="tutend" onClick={next}>
      <div className="tutend-shop">
        <img className="tutend-shop-img" src="/assets/bg_cake_shop.webp" alt="케이크샵" />
        <img className="tutend-seal" src="/assets/story_assistant_full.webp" alt="커스터드물범" />
      </div>
      <div className="tut-guide stk">
        <span className="tut-guide-face">
          <img src="/assets/story_face_assistant.webp" alt="" />
          <span className="tut-guide-name">커스터드물범</span>
        </span>
        <p className="tut-guide-line">{LINES[i].replaceAll("{name}", name)}</p>
        <span className="tut-guide-adv">≫</span>
      </div>
    </div>
  );
}
