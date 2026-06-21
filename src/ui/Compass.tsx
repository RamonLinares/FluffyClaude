import { useEffect, useRef } from "react";
import { useGame } from "../game/useGame";
import { compass } from "../game/compass";

// A small dial that points toward the nearest uncollected quest item. It reads
// the compass state in a requestAnimationFrame loop and mutates DOM styles
// directly, so it never triggers React re-renders while you roll around.
export function Compass() {
  const g = useGame();
  const wrapRef = useRef<HTMLDivElement>(null);
  const rotRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLElement>(null);
  const iconRef = useRef<HTMLElement>(null);
  const distRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let lastIcon = "";
    const tick = () => {
      const c = compass;
      const wrap = wrapRef.current;
      if (wrap) {
        wrap.style.opacity = c.visible ? "1" : "0";
        wrap.style.transform = c.visible ? "scale(1)" : "scale(0.8)";
      }
      if (rotRef.current) rotRef.current.style.transform = `rotate(${c.angle}deg)`;
      if (arrowRef.current) arrowRef.current.style.color = c.color;
      if (iconRef.current) {
        iconRef.current.style.color = c.color;
        if (c.icon !== lastIcon) {
          iconRef.current.className = c.icon;
          lastIcon = c.icon;
        }
      }
      if (distRef.current)
        distRef.current.textContent = c.visible ? `${Math.max(0, Math.round(c.distance))}m` : "";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (g.phase !== "playing") return null;

  return (
    <div className="compass" ref={wrapRef} aria-hidden="true">
      <div className="compass-dial glass">
        <div className="compass-rot" ref={rotRef}>
          <i className="fa-solid fa-location-arrow compass-arrow" ref={arrowRef} />
        </div>
        <i className="fa-solid fa-gem compass-icon" ref={iconRef} />
      </div>
      <span className="compass-dist" ref={distRef} />
    </div>
  );
}
