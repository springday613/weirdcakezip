import { useEffect, useState } from "react";
import { fillLine } from "../data/story.js";

// 문장이 끝나는 자리(.·!·?·…·~ 뒤 공백)마다 줄을 바꿔 호흡을 만든다.
// 단, 짧은 문장끼리는 한 줄로 병합 — 줄이 너무 잘게 쪼개지지 않게.
// 대본에서 특정 지점을 강제로 붙이고 싶으면 공백 대신  (줄바꿈 금지 공백)을 쓴다.
const BREATH_MAX = 22; // 병합해도 이 글자수를 넘지 않을 때만 같은 줄
const breath = (text) => {
  const lines = [];
  for (const p of text.split(/(?<=[.!?…~]) +/)) {
    const last = lines[lines.length - 1];
    if (last != null && (last + " " + p).length <= BREATH_MAX) {
      lines[lines.length - 1] = last + " " + p;
    } else {
      lines.push(p);
    }
  }
  return lines.map((seg, k) => (
    <span key={k}>
      {k > 0 && <br />}
      {seg}
    </span>
  ));
};

// 대사의 face 값 → 프로필 그림(바스트샷 원형 크롭). 얼굴이 화면에 나오기 전(face 없음)엔 실루엣.
const FACE_SRC = {
  user: "/assets/story_face_user.webp",
  chef: "/assets/story_face_chef.webp",
  assistant: "/assets/story_face_assistant.webp",
  pink: "/assets/story_face_pink.webp",
};

// 스토리 화면 (S19) — 컷 위에 말풍선 대사가 한 줄씩 나온다.
// 탭/≫ 는 대사 한 줄씩, 대사가 끝나면 다음 컷. 건너뛰기는 종료.
// money: 대사의 {money} 치환용 — 엔딩에서 실제 번 코인을 보여준다.
export default function StoryScreen({ cuts, name = "", onDone, money = 0 }) {
  const [i, setI] = useState(0);   // 컷 번호
  const [li, setLi] = useState(0); // 컷 안 대사 번호
  const cut = cuts[i];
  const lines = cut.lines ?? [];
  const line = lines[li];

  // 다음 컷 미리 받기 — 탭한 순간에 처음 받으면 넘김이 굼떠진다
  useEffect(() => {
    if (i + 1 < cuts.length) {
      const im = new Image();
      im.src = cuts[i + 1].img;
    }
  }, [i, cuts]);

  const nextCut = () => {
    if (i + 1 < cuts.length) {
      setI(i + 1);
      setLi(0);
    } else onDone();
  };
  // 대사 한 줄 진행 — 이 컷의 대사가 끝났으면 다음 컷. 진행은 탭/≫ 만으로.
  const advance = () => (li + 1 < lines.length ? setLi(li + 1) : nextCut());

  return (
    <div className="story" onClick={advance}>
      <img className="story-cut" src={cut.img} alt={`스토리 컷 ${i + 1}`} />

      {line && (
        <div className="story-bubble stk">
          <span className="story-face">
            <img src={line.face ? FACE_SRC[line.face] : "/assets/ui_silhouette.svg"} alt="" />
            <span className="story-who">{fillLine(line.who, name, money)}</span>
          </span>
          <p className="story-line">{breath(fillLine(line.text, name, money))}</p>
          <button
            className="story-adv"
            aria-label="다음 대사"
            onClick={(e) => { e.stopPropagation(); advance(); }}
          >
            ≫
          </button>
        </div>
      )}

      <div className="story-nav">
        <button
          className="chip ghost story-skip"
          onClick={(e) => { e.stopPropagation(); onDone(); }}
        >
          건너뛰기
        </button>
      </div>
    </div>
  );
}
