import { useGame } from "../game/useGame";

const HUES = [330, 350, 25, 50, 150, 190, 215, 270];

export function StartScreen() {
  const g = useGame();
  if (g.phase !== "start") return null;

  return (
    <div className="start">
      <div className="start-card glass">
        <div className="logo title-font">Fluffy Planet</div>
        <div className="tag">
          Roll a fuzzy little friend across dreamy worlds and finish five gentle
          quests on each.
        </div>

        <div className="field-label">Pick your fluff</div>
        <div className="hues" style={{ marginBottom: 4 }}>
          {HUES.map((h) => (
            <button
              key={h}
              className={`hue-chip ${g.fluffHue === h ? "sel" : ""}`}
              style={{
                background: `hsl(${h}, 70%, 78%)`,
              }}
              onClick={() => g.setFluffHue(h)}
              aria-label={`Fluff color ${h}`}
            />
          ))}
        </div>

        <div className="controls-hint">
          <span>
            <b>Mobile:</b> drag to roll · double-tap to jump
          </span>
          <span>
            <b>Desktop:</b> WASD / arrows · drag to look · space to jump
          </span>
        </div>

        <button className="btn btn-primary btn-full" onClick={() => g.beginPlay()}>
          <i className="fa-solid fa-play" />
          {g.hasSave ? `Continue · Planet ${g.planet.index + 1}` : "Start the journey"}
        </button>

        <div className="spacer" />
        <button
          className="btn btn-ghost btn-full"
          onClick={() => {
            g.setShowCode(true);
          }}
        >
          <i className="fa-solid fa-ticket" />
          I have a travel code
        </button>
      </div>
    </div>
  );
}
