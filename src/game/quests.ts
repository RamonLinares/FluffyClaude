import * as THREE from "three";
import { Planet } from "./planet";
import { Rng, mixSeed } from "./rng";

export type MarkerKind =
  | "orb"
  | "crystal"
  | "flower"
  | "feather"
  | "lantern"
  | "sheep"
  | "flag";

export interface QuestTarget {
  id: string;
  dir: THREE.Vector3;
  pos: THREE.Vector3;
  collected: boolean;
}

export interface Quest {
  id: string;
  kind: string;
  title: string;
  hint: string;
  icon: string; // Font Awesome class
  marker: MarkerKind;
  color: string;
  targets: QuestTarget[];
  get total(): number;
  get collected(): number;
  get done(): boolean;
}

interface Template {
  kind: string;
  title: string;
  hint: string;
  icon: string;
  marker: MarkerKind;
  min: number;
  max: number;
}

const TEMPLATES: Template[] = [
  {
    kind: "motes",
    title: "Gather Star Motes",
    hint: "Tiny lights drift over the meadows — roll into each one.",
    icon: "fa-solid fa-star",
    marker: "orb",
    min: 5,
    max: 6,
  },
  {
    kind: "crystals",
    title: "Wake the Crystals",
    hint: "Sleepy crystals hum softly. Nudge each one awake.",
    icon: "fa-solid fa-gem",
    marker: "crystal",
    min: 4,
    max: 5,
  },
  {
    kind: "blossoms",
    title: "Tend the Blossoms",
    hint: "Visit every blossom to help it bloom.",
    icon: "fa-solid fa-spa",
    marker: "flower",
    min: 4,
    max: 6,
  },
  {
    kind: "feathers",
    title: "Find Lost Feathers",
    hint: "Soft feathers settled across the world. Collect them all.",
    icon: "fa-solid fa-feather",
    marker: "feather",
    min: 5,
    max: 6,
  },
  {
    kind: "lanterns",
    title: "Light the Lanterns",
    hint: "Drift past each lantern to set it glowing.",
    icon: "fa-solid fa-fire",
    marker: "lantern",
    min: 4,
    max: 5,
  },
  {
    kind: "sheep",
    title: "Greet the Cloud Sheep",
    hint: "Fluffy cloud-sheep wander the hills. Say hello to each.",
    icon: "fa-solid fa-cloud",
    marker: "sheep",
    min: 4,
    max: 5,
  },
  {
    kind: "summit",
    title: "Reach the Summit",
    hint: "Climb to the highest peak and breathe it all in.",
    icon: "fa-solid fa-mountain-sun",
    marker: "flag",
    min: 1,
    max: 1,
  },
];

function makeQuest(t: Template, color: string, targets: QuestTarget[]): Quest {
  return {
    id: t.kind,
    kind: t.kind,
    title: t.title,
    hint: t.hint,
    icon: t.icon,
    marker: t.marker,
    color,
    targets,
    get total() {
      return this.targets.length;
    },
    get collected() {
      return this.targets.filter((x) => x.collected).length;
    },
    get done() {
      return this.targets.every((x) => x.collected);
    },
  };
}

/** How close the fluffball must roll to a marker to collect it (world units). */
export const COLLECT_RADIUS = 1.6;

/** The player always arrives at the planet's north pole; keep it marker-free. */
const SPAWN_DIR = new THREE.Vector3(0, 1, 0);

/**
 * Five distinct, deterministic quests for a planet. Marker placement is seeded
 * so reloading rebuilds the exact same world; collection state is layered on top.
 */
export function generateQuests(planet: Planet): Quest[] {
  const rng = new Rng(mixSeed(planet.theme.seed, 0x9151));
  const pool = [...TEMPLATES];
  // shuffle templates
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen = pool.slice(0, 5);

  const palette = [
    planet.theme.accent,
    planet.theme.accent2,
    "#ffe08a",
    "#ffb3cd",
    "#bfe9ff",
  ];

  return chosen.map((t, qi) => {
    const count = rng.int(t.min, t.max);
    const seed = mixSeed(planet.theme.seed, (qi + 1) * 0x2f1b);
    let targets: QuestTarget[];

    if (t.kind === "summit") {
      const top = planet.highestPoint(700, seed);
      targets = [
        {
          id: `${t.kind}-0`,
          dir: top.dir.clone(),
          pos: top.pos.clone(),
          collected: false,
        },
      ];
    } else {
      // "sheep" float a touch above the ground
      const lift = t.kind === "sheep" ? 0.9 : t.marker === "orb" ? 0.7 : 0.0;
      targets = planet
        .scatter(count, seed, true, SPAWN_DIR)
        .map((p, i) => {
        const pos = p.dir
          .clone()
          .multiplyScalar(planet.standRadius(p.dir) + lift);
        return {
          id: `${t.kind}-${i}`,
          dir: p.dir.clone(),
          pos,
          collected: false,
        };
      });
    }

    return makeQuest(t, palette[qi % palette.length], targets);
  });
}

/** Total markers collected across all quests. */
export function totalCollected(quests: Quest[]): number {
  return quests.reduce((s, q) => s + q.collected, 0);
}

export function allQuestsDone(quests: Quest[]): boolean {
  return quests.every((q) => q.done);
}
