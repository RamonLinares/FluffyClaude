import { useGame } from "../game/useGame";

export function Hud() {
  const g = useGame();
  const planet = g.planet;
  const active =
    g.quests.find((q) => q.id === g.activeQuestId) ?? g.quests[0];
  const doneCount = g.quests.filter((q) => q.done).length;

  return (
    <>
      <div className="hud-top safe">
        <div className="planet-card glass">
          <div className="badge">{planet.index + 1}</div>
          <div className="meta">
            <span className="name title-font">{planet.theme.name}</span>
            <span className="sub">
              {doneCount}/5 quests · {g.planetsCompleted} worlds visited
            </span>
          </div>
        </div>

        <div className="btn-row">
          <button
            className={`icon-btn ${g.muted ? "" : "on"}`}
            onClick={() => g.toggleMute()}
            aria-label={g.muted ? "Unmute" : "Mute"}
            title={g.muted ? "Unmute" : "Mute"}
          >
            <i className={`fa-solid ${g.muted ? "fa-volume-xmark" : "fa-volume-high"}`} />
          </button>
          <button
            className="icon-btn"
            onClick={() => g.setShowHelp(true)}
            aria-label="How to play"
            title="How to play"
          >
            <i className="fa-solid fa-question" />
          </button>
          <button
            className="icon-btn"
            onClick={() => g.setShowCode(true)}
            aria-label="Menu and travel code"
            title="Travel code & customize"
          >
            <i className="fa-solid fa-bars" />
          </button>
        </div>
      </div>

      {active && (
        <div className="quests glass">
          <div className="quest-active">
            <div className="q-icon" style={{ background: active.color }}>
              <i className={active.icon} />
            </div>
            <div className="q-body">
              <div className="q-title">
                <span>{active.title}</span>
                <span className="q-count">
                  {active.collected}/{active.total}
                </span>
              </div>
              <div className="q-bar">
                <i
                  style={{
                    width: `${(active.collected / active.total) * 100}%`,
                    background: active.color,
                  }}
                />
              </div>
              <div className="q-hint">{active.hint}</div>
            </div>
          </div>

          <div className="q-dots">
            {g.quests.map((q) => (
              <button
                key={q.id}
                className={`q-dot ${q.id === active.id ? "active" : ""} ${
                  q.done ? "done" : ""
                }`}
                style={q.done ? { background: q.color, borderColor: "transparent" } : undefined}
                onClick={() => g.setActiveQuest(q.id)}
                title={q.title}
              >
                <i className={q.icon} />
                {q.done && (
                  <span className="check">
                    <i className="fa-solid fa-check" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="desktop-hint">
        <i className="fa-solid fa-keyboard" /> WASD / arrows to roll · drag to look ·
        space to jump
      </div>
    </>
  );
}
