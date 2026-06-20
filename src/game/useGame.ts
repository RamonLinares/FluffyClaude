import { useSyncExternalStore } from "react";
import { store } from "./store";

/** Subscribe a component to the game store; re-renders on any state change. */
export function useGame() {
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
  return store;
}

/** Coarse device/quality detection for mobile-friendly defaults. */
export function detectQuality(): "low" | "high" {
  if (typeof window === "undefined") return "high";
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 740;
  const lowMem =
    (navigator as unknown as { deviceMemory?: number }).deviceMemory !== undefined &&
    (navigator as unknown as { deviceMemory: number }).deviceMemory <= 4;
  return coarse || small || lowMem ? "low" : "high";
}
