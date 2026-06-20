import { useRef, useState } from "react";
import { inputState } from "../game/input";

const RADIUS = 56;

export function Joystick() {
  const [base, setBase] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pointerId = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });

  const onDown = (e: React.PointerEvent) => {
    if (pointerId.current !== null) return;
    pointerId.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    origin.current = { x: e.clientX, y: e.clientY };
    setBase({ x: e.clientX, y: e.clientY });
    setKnob({ x: 0, y: 0 });
    inputState.joyActive = true;
    e.stopPropagation();
  };

  const onMove = (e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    let dx = e.clientX - origin.current.x;
    let dy = e.clientY - origin.current.y;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    inputState.joy.set(dx / RADIUS, -dy / RADIUS); // up = forward
    e.stopPropagation();
  };

  const onUp = (e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    setBase(null);
    setKnob({ x: 0, y: 0 });
    inputState.joy.set(0, 0);
    inputState.joyActive = false;
    e.stopPropagation();
  };

  return (
    <div
      className="joy-zone"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {base && (
        <div className="joy-base" style={{ left: base.x, top: base.y }}>
          <div
            className="joy-knob"
            style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
          >
            <i className="fa-solid fa-up-down-left-right" />
          </div>
        </div>
      )}
    </div>
  );
}
