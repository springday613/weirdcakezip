// 진행바 6칸 — 표시 전용 (탭으로 이동 불가, 8px 라 tap-min 미충족)
export default function StepBar({ step, steps }) {
  const cur = steps[step] ?? steps[0];
  return (
    <div className="stepbar-wrap">
      <div className="seg-bar">
        {steps.map((s, i) => (
          <div
            key={s.id}
            className={"seg" + (i < step ? " done" : i === step ? " now" : "")}
          />
        ))}
      </div>
      <div className="step-title">
        {step + 1} / {steps.length} · {cur.label}
      </div>
    </div>
  );
}
