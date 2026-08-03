import { useEffect, useState } from "react";
import { fillLine } from "../data/story.js";

// 화자 → 얼굴 그림. 정체를 숨긴 화자(??·???)는 ? 원으로.
const FACES = {
  "{name}": "/assets/story_face_user.webp",
  "점박이말차": "/assets/story_face_chef.webp",
  "커스터드물범": "/assets/story_face_assistant.webp",
};

// 스토리 화면 (S19) — 컷 위에 말풍선 대사가 한 줄씩 나온다.
// 탭/≫ 는 대사 한 줄씩, 대사가 끝나면 다음 컷. ←/다음은 컷 단위 이동, 건너뛰기는 종료.
export default function StoryScreen({ cuts, name = "", onDone }) {
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
            {FACES[line.who] ? (
              <img src={FACES[line.who]} alt="" />
            ) : (
              <span className="story-face-q">?</span>
            )}
            <span className="story-who">{fillLine(line.who, name)}</span>
          </span>
          <p className="story-line">{fillLine(line.text, name)}</p>
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
