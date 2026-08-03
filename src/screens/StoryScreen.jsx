import { useEffect, useState } from "react";

// 스토리 화면 (S19) — 컷을 한 장씩 넘겨 본다. 화면 아무 데나 탭하면 다음, 건너뛰기 가능.
export default function StoryScreen({ cuts, onDone }) {
  const [i, setI] = useState(0);

  // 다음 컷 미리 받기 — 탭한 순간에 처음 받으면 넘김이 굼떠진다
  useEffect(() => {
    if (i + 1 < cuts.length) {
      const im = new Image();
      im.src = cuts[i + 1];
    }
  }, [i, cuts]);

  const next = () => (i + 1 < cuts.length ? setI(i + 1) : onDone());

  return (
    <div className="story" onClick={next}>
      <img className="story-cut" src={cuts[i]} alt={`스토리 컷 ${i + 1}`} />
      <div className="story-nav">
        <span className="story-progress">{i + 1} / {cuts.length}</span>
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
