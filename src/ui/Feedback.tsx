import { useGame } from "../game/useGame";

export function Toast() {
  const g = useGame();
  if (!g.toast) return null;
  const t = g.toast;
  return (
    <div className="toast glass" key={t.id}>
      <div className="t-icon" style={{ background: t.color }}>
        <i className={t.icon} />
      </div>
      <div>
        <div className="t-text">{t.text}</div>
        {t.sub && <div className="t-sub">{t.sub}</div>}
      </div>
    </div>
  );
}

export function Transition() {
  const g = useGame();
  if (g.phase !== "transition") return null;
  return (
    <>
      <div className="warp" />
      <div className="warp-label title-font">
        <span>
          <i className="fa-solid fa-wand-magic-sparkles" /> Drifting to a new
          world…
        </span>
      </div>
    </>
  );
}
