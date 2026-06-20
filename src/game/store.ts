import * as THREE from "three";
import { Planet, getPlanet } from "./planet";
import {
  Quest,
  generateQuests,
  allQuestsDone,
  QuestTarget,
} from "./quests";
import {
  SaveData,
  loadSave,
  writeSave,
  applyProgress,
  snapshotProgress,
} from "./storage";
import { audio } from "./audio";

export type Phase = "start" | "playing" | "transition";

export interface Toast {
  id: number;
  icon: string;
  text: string;
  sub?: string;
  color: string;
}

export interface Pop {
  id: number;
  pos: THREE.Vector3;
  color: string;
  born: number;
}

class GameStore {
  version = 0;
  private listeners = new Set<() => void>();

  phase: Phase = "start";
  hasSave = false;
  planet: Planet = getPlanet(0);
  quests: Quest[] = [];
  activeQuestId: string | null = null;
  toast: Toast | null = null;
  pops: Pop[] = [];
  muted = false;
  postFx = false;
  fluffHue = 330;
  planetsCompleted = 0;
  lifetimeCollected = 0;
  showCode = false;
  showHelp = false;

  // mutated every frame by the controller; does NOT trigger React renders
  playerPos = new THREE.Vector3(0, 0, 0);

  private save: SaveData = loadSave();
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private idCounter = 1;

  constructor() {
    this.hasSave =
      this.save.planetIndex > 0 ||
      Object.values(this.save.collected).some((a) => a.length > 0);
    this.muted = this.save.muted;
    this.postFx = this.save.postFx;
    this.fluffHue = this.save.fluffHue;
    this.planetsCompleted = this.save.planetsCompleted;
    this.lifetimeCollected = this.save.lifetimeCollected;
    this.loadPlanet(this.save.planetIndex, this.save.collected);
  }

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };
  getVersion = () => this.version;

  private emit() {
    this.version++;
    this.listeners.forEach((l) => l());
  }

  private nextId() {
    return this.idCounter++;
  }

  private loadPlanet(index: number, collected?: Record<string, string[]>) {
    this.planet = getPlanet(index);
    this.quests = generateQuests(this.planet);
    if (collected) applyProgress(this.quests, collected);
    this.activeQuestId =
      this.quests.find((q) => !q.done)?.id ?? this.quests[0].id;
  }

  private persist() {
    this.save.planetIndex = this.planet.index;
    this.save.collected = snapshotProgress(this.quests);
    this.save.fluffHue = this.fluffHue;
    this.save.muted = this.muted;
    this.save.postFx = this.postFx;
    this.save.planetsCompleted = this.planetsCompleted;
    this.save.lifetimeCollected = this.lifetimeCollected;
    writeSave(this.save);
  }

  // ---- actions ----

  async beginPlay() {
    await audio.start(this.muted);
    this.phase = "playing";
    this.emit();
  }

  setActiveQuest(id: string) {
    this.activeQuestId = id;
    this.emit();
  }

  toggleMute() {
    this.muted = !this.muted;
    audio.setMuted(this.muted);
    this.persist();
    this.emit();
  }

  togglePostFx() {
    this.postFx = !this.postFx;
    this.persist();
    this.emit();
  }

  setFluffHue(h: number) {
    this.fluffHue = ((h % 360) + 360) % 360;
    this.persist();
    this.emit();
  }

  setShowCode(v: boolean) {
    this.showCode = v;
    this.emit();
  }
  setShowHelp(v: boolean) {
    this.showHelp = v;
    this.emit();
  }

  private showToast(t: Omit<Toast, "id">) {
    this.toast = { ...t, id: this.nextId() };
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast = null;
      this.emit();
    }, 3200);
  }

  /** Called from the controller when the fluffball reaches a marker. */
  collect(quest: Quest, target: QuestTarget) {
    if (target.collected) return;
    target.collected = true;
    this.lifetimeCollected++;
    this.pops.push({
      id: this.nextId(),
      pos: target.pos.clone(),
      color: quest.color,
      born: performance.now(),
    });
    if (this.pops.length > 12) this.pops.shift();
    audio.collect();

    if (quest.done) {
      audio.questComplete();
      this.showToast({
        icon: quest.icon,
        text: `${quest.title} complete!`,
        sub: this.remainingQuests() > 0
          ? `${this.remainingQuests()} quest${this.remainingQuests() > 1 ? "s" : ""} to go`
          : "All quests done!",
        color: quest.color,
      });
      // move active quest to next unfinished
      const next = this.quests.find((q) => !q.done);
      this.activeQuestId = next?.id ?? quest.id;
      if (allQuestsDone(this.quests)) {
        this.completePlanet();
      }
    }
    this.persist();
    this.emit();
  }

  private remainingQuests() {
    return this.quests.filter((q) => !q.done).length;
  }

  private completePlanet() {
    this.phase = "transition";
    this.planetsCompleted++;
    audio.teleport();
    this.emit();
    // swap worlds behind the warp flash
    setTimeout(() => {
      const nextIndex = this.planet.index + 1;
      this.loadPlanet(nextIndex, {});
      this.save.collected = {};
      this.persist();
      // recenter player at top of new planet for a fresh arrival
      this.playerPos.set(0, this.planet.standRadius(new THREE.Vector3(0, 1, 0)), 0);
      this.phase = "playing";
      this.showToast({
        icon: "fa-solid fa-wand-magic-sparkles",
        text: `Welcome to ${this.planet.theme.name}`,
        sub: "Five new quests await",
        color: this.planet.theme.accent,
      });
      this.emit();
    }, 1700);
  }

  /** Jump to a specific planet via a travel code (fresh quests). */
  travelTo(index: number) {
    this.loadPlanet(index, {});
    this.save.collected = {};
    if (index > this.planetsCompleted) this.planetsCompleted = index;
    this.playerPos.set(0, this.planet.standRadius(new THREE.Vector3(0, 1, 0)), 0);
    this.persist();
    this.showCode = false;
    this.phase = "playing";
    audio.teleport();
    this.showToast({
      icon: "fa-solid fa-rocket",
      text: `Arrived at ${this.planet.theme.name}`,
      sub: "Planet " + (index + 1),
      color: this.planet.theme.accent,
    });
    this.emit();
  }

  prunePops(now: number) {
    const before = this.pops.length;
    this.pops = this.pops.filter((p) => now - p.born < 900);
    if (this.pops.length !== before) this.emit();
  }
}

export const store = new GameStore();

// Dev-only hook for debugging / automated checks.
if (import.meta.env.DEV) {
  (window as unknown as { fluffyStore: GameStore }).fluffyStore = store;
}
