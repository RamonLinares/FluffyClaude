import * as THREE from "three";

// Shared, mutable input state. Touch/pen presses write `pressMove`; the
// keyboard writes `move`; the controller reads whichever is active each frame.
export const inputState = {
  move: new THREE.Vector2(0, 0), // keyboard, range -1..1 (x=right, y=forward)
  pressMove: new THREE.Vector2(0, 0), // screen press, range -1..1
  pressMoveActive: false,
  yaw: 0, // camera orbit offset (radians), driven by drag
  jumpQueued: false, // set by Space / double-tap, consumed by the controller
};

/** Read and clear a pending jump request. */
export function consumeJump(): boolean {
  if (inputState.jumpQueued) {
    inputState.jumpQueued = false;
    return true;
  }
  return false;
}

const keys: Record<string, boolean> = {};

function recompute() {
  let x = 0;
  let y = 0;
  if (keys["KeyW"] || keys["ArrowUp"]) y += 1;
  if (keys["KeyS"] || keys["ArrowDown"]) y -= 1;
  if (keys["KeyD"] || keys["ArrowRight"]) x += 1;
  if (keys["KeyA"] || keys["ArrowLeft"]) x -= 1;
  const v = inputState.move.set(x, y);
  if (v.lengthSq() > 1) v.normalize();
}

let initialized = false;
export function initKeyboard() {
  if (initialized) return;
  initialized = true;
  const down = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      // ignore while typing (e.g. entering a travel code)
      const a = document.activeElement;
      const typing = a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA");
      if (!typing) {
        inputState.jumpQueued = true;
        e.preventDefault();
      }
      return;
    }
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.code)
    ) {
      keys[e.code] = true;
      recompute();
      e.preventDefault();
    }
  };
  const up = (e: KeyboardEvent) => {
    if (keys[e.code]) {
      keys[e.code] = false;
      recompute();
    }
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    recompute();
  });
}

// Dev-only hook so automated checks can drive movement without focus/blur issues.
if (import.meta.env.DEV) {
  (window as unknown as { fluffyInput: typeof inputState }).fluffyInput = inputState;
}

/** The active desired move vector (screen press wins while touched). */
export function getMove(out: THREE.Vector2): THREE.Vector2 {
  if (inputState.pressMoveActive) out.copy(inputState.pressMove);
  else out.copy(inputState.move);
  if (out.lengthSq() > 1) out.normalize();
  return out;
}
