// localStorage persistence. Stores the reached planet and in-planet progress so a
// refresh never loses your place. The travel code (shareCode.ts) is the portable
// counterpart for moving between devices.

import { Quest } from "./quests";

const KEY = "fluffy-planet-save:v1";

export interface SaveData {
  version: number;
  planetIndex: number;
  // questId -> collected target ids
  collected: Record<string, string[]>;
  fluffHue: number; // cosmetic character tint (0..360)
  planetsCompleted: number;
  lifetimeCollected: number;
  muted: boolean;
  postFx: boolean; // bloom / glow post-processing
  updatedAt: number;
}

export function defaultSave(): SaveData {
  return {
    version: 1,
    planetIndex: 0,
    collected: {},
    fluffHue: 330,
    planetsCompleted: 0,
    lifetimeCollected: 0,
    muted: false,
    // Glow/bloom is OFF by default: the post-processing pipeline causes
    // full-screen flicker on some GPUs. Opt in via the menu toggle.
    postFx: false,
    updatedAt: Date.now(),
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return { ...defaultSave(), ...parsed };
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData): void {
  try {
    data.updatedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage may be unavailable (private mode) — game still runs in-memory */
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Apply saved collection flags onto freshly generated quests. */
export function applyProgress(quests: Quest[], collected: Record<string, string[]>): void {
  for (const q of quests) {
    const ids = collected[q.id];
    if (!ids) continue;
    const set = new Set(ids);
    for (const t of q.targets) {
      if (set.has(t.id)) t.collected = true;
    }
  }
}

/** Snapshot the current collection flags for saving. */
export function snapshotProgress(quests: Quest[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const q of quests) {
    out[q.id] = q.targets.filter((t) => t.collected).map((t) => t.id);
  }
  return out;
}
