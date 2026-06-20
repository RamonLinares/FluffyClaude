import { useState } from "react";
import { useGame } from "../game/useGame";
import {
  encodeTravelCode,
  formatTravelCode,
  decodeTravelCode,
} from "../game/shareCode";
import { clearSave } from "../game/storage";

const HUES = [330, 350, 10, 25, 50, 90, 150, 175, 195, 215, 250, 285];

export function MenuModal() {
  const g = useGame();
  const [copied, setCopied] = useState(false);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!g.showCode) return null;
  const code = encodeTravelCode(g.planet.index);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatTravelCode(code));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const go = () => {
    const idx = decodeTravelCode(entry);
    if (idx === null) {
      setError("Hmm, that code doesn't look right.");
      return;
    }
    setError(null);
    if (g.phase === "start") {
      // jump straight in
      g.beginPlay();
    }
    g.travelTo(idx);
  };

  return (
    <div className="scrim" onClick={() => g.setShowCode(false)}>
      <div className="panel glass" onClick={(e) => e.stopPropagation()}>
        <h2 className="title-font">Travel & Customize</h2>
        <p className="lead">
          Continue this journey on another device, or change your fluff.
        </p>

        <div className="field-label">Your travel code for this planet</div>
        <div className="code-display">{formatTravelCode(code)}</div>
        <div className="spacer" />
        <button className="btn btn-primary btn-full" onClick={copy}>
          <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`} />
          {copied ? "Copied!" : "Copy code"}
        </button>

        <div className="spacer" />
        <div className="spacer" />

        <div className="field-label">Enter a travel code</div>
        <div className="row">
          <input
            className="code-input"
            placeholder="ABC-DE"
            value={entry}
            maxLength={8}
            onChange={(e) => {
              setEntry(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && go()}
          />
          <button className="btn btn-primary" onClick={go}>
            <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
        {error && <div className="muted-note" style={{ color: "#e0699a" }}>{error}</div>}

        <div className="spacer" />
        <div className="spacer" />

        <div className="field-label">Fluff color</div>
        <div className="hues">
          {HUES.map((h) => (
            <button
              key={h}
              className={`hue-chip ${g.fluffHue === h ? "sel" : ""}`}
              style={{ background: `hsl(${h}, 70%, 78%)` }}
              onClick={() => g.setFluffHue(h)}
              aria-label={`Fluff color ${h}`}
            />
          ))}
        </div>

        <div className="spacer" />
        <div className="spacer" />

        <div className="field-label">Effects</div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span>
            <i className="fa-solid fa-wand-magic-sparkles" /> Glow &amp; bloom
          </span>
          <button
            className={`icon-btn ${g.postFx ? "on" : ""}`}
            onClick={() => g.togglePostFx()}
            aria-label="Toggle glow effects"
          >
            <i className={`fa-solid ${g.postFx ? "fa-toggle-on" : "fa-toggle-off"}`} />
          </button>
        </div>
        <div className="muted-note">
          Turn this off if the screen flickers on your device.
        </div>

        <div className="spacer" />
        <div className="spacer" />

        {!confirmReset ? (
          <button
            className="btn btn-ghost btn-full"
            onClick={() => setConfirmReset(true)}
          >
            <i className="fa-solid fa-rotate-left" /> Reset progress
          </button>
        ) : (
          <div className="row">
            <button
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={() => setConfirmReset(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, background: "linear-gradient(135deg,#ff8aa6,#ffb0c4)" }}
              onClick={() => {
                clearSave();
                location.reload();
              }}
            >
              <i className="fa-solid fa-trash" /> Erase
            </button>
          </div>
        )}

        <div className="spacer" />
        <button className="btn btn-ghost btn-full" onClick={() => g.setShowCode(false)}>
          Close
        </button>
      </div>
    </div>
  );
}

export function HelpModal() {
  const g = useGame();
  if (!g.showHelp) return null;
  return (
    <div className="scrim" onClick={() => g.setShowHelp(false)}>
      <div className="panel glass" onClick={(e) => e.stopPropagation()}>
        <h2 className="title-font">How to play</h2>
        <p className="lead">A calm little game. There's no way to lose — just explore.</p>
        <ul style={{ lineHeight: 1.7, paddingLeft: 18, color: "var(--ink)" }}>
          <li>
            <b>Move:</b> drag the left side of the screen, or use{" "}
            <b>WASD / arrow keys</b>.
          </li>
          <li>
            <b>Look around:</b> drag the rest of the screen (or mouse).
          </li>
          <li>
            <b>Jump:</b> press <b>space</b>, or <b>double-tap</b> the screen.
          </li>
          <li>
            <b>Quests:</b> roll into the glowing markers. Finish all{" "}
            <b>5 quests</b> to open a portal to a brand-new planet.
          </li>
          <li>
            <b>Saving:</b> your progress is kept on this device. Grab a{" "}
            <b>travel code</b> from the menu to continue elsewhere.
          </li>
        </ul>
        <div className="spacer" />
        <button className="btn btn-primary btn-full" onClick={() => g.setShowHelp(false)}>
          <i className="fa-solid fa-heart" /> Got it
        </button>
      </div>
    </div>
  );
}
