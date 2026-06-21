// Procedural pastel palettes driven by *biomes*. Each planet picks a biome which
// gives it a strong identity — palette, terrain shape, decoration recipe, sky,
// clouds, landmarks and *celestial* features (rings, moons, one or two suns,
// deep-space skies). Hues are jittered per planet so no two worlds look alike.
// Everything is seeded, so planet N is the same on every device.

import { Rng, mixSeed } from "./rng";

// A single decoration layer scattered across the surface.
export type DecoKind =
  | "flowers"
  | "tufts"
  | "rocks"
  | "pebbles"
  | "pines"
  | "crystals"
  | "mushrooms"
  | "blossoms"
  | "spires"
  | "reeds"
  | "trees"
  | "palms"
  | "houses"
  | "lamps"
  | "gears"
  | "panels"
  | "craters";

export interface DecoLayer {
  kind: DecoKind;
  density: number; // multiplier on the base count for this layer
}

export interface RingConfig {
  color: string;
  color2: string;
  inner: number; // world radius
  outer: number;
  tilt: number; // radians
}

export interface MoonConfig {
  color: string;
  emissive: string | null;
  size: number;
  dist: number; // orbit radius
  speed: number; // rad/s
  tiltX: number;
  tiltZ: number;
  phase: number;
}

export interface StarConfig {
  color: string;
  intensity: number;
  dir: [number, number, number]; // unit-ish direction to the star
  size: number;
}

export interface PlanetTheme {
  index: number;
  seed: number;
  name: string;
  biome: string;

  // Sky dome gradient (top -> horizon -> bottom)
  skyTop: string;
  skyHorizon: string;
  skyBottom: string;
  fog: string;
  fogDensity: number;
  cloudColor: string;
  cloudiness: number; // 0..1 amount of clouds in the sky

  // Terrain elevation ramp (low shoreline -> peaks)
  sea: string;
  terrainLow: string;
  terrainMid: string;
  terrainHigh: string;
  terrainPeak: string;
  hasSea: boolean;
  seaLevel: number; // normalized 0..1 in the displacement range

  // Glow / collectibles / props
  accent: string;
  accent2: string;
  flowerColors: string[]; // bright bloom palette for flower carpets
  rockColor: string;
  tuftColor: string;
  structureColor: string; // walls / metal / wood for civic & mech props

  // Lighting hints
  ambientColor: string;
  sunColor: string;
  sunIntensity: number;
  suns: StarConfig[]; // 1 (single) or 2 (double-star) visible stars

  // Terrain shape
  amplitude: number; // peak displacement above base radius
  frequency: number; // noise frequency
  ruggedness: number; // 0 = rolling hills, 1 = ridged/jagged

  // Decoration recipe (drawn as layered instanced props)
  decoration: DecoKind; // headline / quest-relevant feature
  decoDensity: number;
  layers: DecoLayer[];

  // Landmarks
  hasRuins: boolean;
  hasIslets: boolean;

  // Celestial
  rings: RingConfig | null;
  moons: MoonConfig[];
  space: boolean; // deep-space sky + starfield
  starColor: string;

  // Atmospheric flourishes
  aurora: boolean;
  auroraColor: string;
  auroraColor2: string;
  hasComets: boolean;
}

const ADJECTIVES = [
  "Velvet", "Drowsy", "Pastel", "Misty", "Dreamy", "Sugar", "Hazy", "Gentle",
  "Whisper", "Marsh", "Cloud", "Twilight", "Cozy", "Silken", "Glimmer", "Sleepy",
  "Lulled", "Hushed", "Faint", "Tender", "Astral", "Lone", "Far", "Quiet",
];

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

interface BiomeDef {
  id: string;
  nouns: string[];
  skyHue: number;
  landHue: number;
  accentHue: number;
  landSat: number;
  landLight: number;
  skySat: number;
  skyLight: number;
  cloudiness: [number, number];
  amplitude: [number, number];
  frequency: [number, number];
  ruggedness: [number, number];
  seaChance: number;
  sunIntensity: [number, number];
  flowerHues: number[];
  layers: DecoLayer[];
  decoration: DecoKind;
  ruinsChance: number;
  isletsChance: number;
  // celestial
  ringChance: number;
  moonChance: number;
  moonMax: number;
  twoStarChance: number;
  spaceChance: number;
}

// Curated biomes. Hues are anchors; we jitter ±a little per planet.
const BIOMES: BiomeDef[] = [
  {
    id: "Meadow",
    nouns: ["Meadow", "Haven", "Glade", "Pasture", "Hollow", "Dale"],
    skyHue: 205, landHue: 110, accentHue: 48,
    landSat: 0.5, landLight: 0.62, skySat: 0.62, skyLight: 0.7,
    cloudiness: [0.5, 0.85], amplitude: [0.8, 1.4], frequency: [1.1, 1.7],
    ruggedness: [0.0, 0.35], seaChance: 0.45, sunIntensity: [1.0, 1.2],
    flowerHues: [50, 0, 320, 280, 200],
    layers: [
      { kind: "tufts", density: 1.6 }, { kind: "flowers", density: 1.3 },
      { kind: "rocks", density: 0.45 }, { kind: "pebbles", density: 0.6 },
      { kind: "pines", density: 0.5 }, { kind: "crystals", density: 0.3 },
    ],
    decoration: "crystals", ruinsChance: 0.8, isletsChance: 0.9,
    ringChance: 0.2, moonChance: 0.5, moonMax: 1, twoStarChance: 0.1, spaceChance: 0,
  },
  {
    id: "Sakura",
    nouns: ["Blossom", "Petal", "Grove", "Sakura", "Bloom", "Orchard"],
    skyHue: 330, landHue: 130, accentHue: 335,
    landSat: 0.42, landLight: 0.64, skySat: 0.55, skyLight: 0.78,
    cloudiness: [0.55, 0.9], amplitude: [0.7, 1.2], frequency: [1.0, 1.5],
    ruggedness: [0.0, 0.25], seaChance: 0.4, sunIntensity: [0.95, 1.15],
    flowerHues: [330, 350, 300, 45],
    layers: [
      { kind: "tufts", density: 1.2 }, { kind: "flowers", density: 1.5 },
      { kind: "blossoms", density: 1.1 }, { kind: "pebbles", density: 0.5 },
      { kind: "rocks", density: 0.35 },
    ],
    decoration: "blossoms", ruinsChance: 0.85, isletsChance: 0.95,
    ringChance: 0.25, moonChance: 0.5, moonMax: 1, twoStarChance: 0.1, spaceChance: 0,
  },
  {
    id: "Tundra",
    nouns: ["Tundra", "Frost", "Glacier", "Drift", "Snowfield", "Floe"],
    skyHue: 200, landHue: 195, accentHue: 195,
    landSat: 0.22, landLight: 0.82, skySat: 0.45, skyLight: 0.8,
    cloudiness: [0.3, 0.6], amplitude: [1.0, 1.8], frequency: [1.2, 2.0],
    ruggedness: [0.3, 0.65], seaChance: 0.5, sunIntensity: [1.0, 1.25],
    flowerHues: [195, 215, 260],
    layers: [
      { kind: "crystals", density: 1.4 }, { kind: "rocks", density: 0.8 },
      { kind: "pebbles", density: 0.7 }, { kind: "spires", density: 0.5 },
      { kind: "tufts", density: 0.3 },
    ],
    decoration: "crystals", ruinsChance: 0.6, isletsChance: 0.9,
    ringChance: 0.35, moonChance: 0.6, moonMax: 2, twoStarChance: 0.2, spaceChance: 0.15,
  },
  {
    id: "Desert",
    nouns: ["Mesa", "Dune", "Wastes", "Canyon", "Basin", "Flats"],
    skyHue: 32, landHue: 38, accentHue: 16,
    landSat: 0.4, landLight: 0.68, skySat: 0.6, skyLight: 0.75,
    cloudiness: [0.15, 0.45], amplitude: [1.1, 2.0], frequency: [1.0, 1.6],
    ruggedness: [0.35, 0.75], seaChance: 0.15, sunIntensity: [1.05, 1.3],
    flowerHues: [10, 35, 330, 280],
    layers: [
      { kind: "spires", density: 1.0 }, { kind: "rocks", density: 1.0 },
      { kind: "pebbles", density: 0.9 }, { kind: "tufts", density: 0.25 },
      { kind: "flowers", density: 0.4 },
    ],
    decoration: "spires", ruinsChance: 0.9, isletsChance: 0.8,
    ringChance: 0.4, moonChance: 0.6, moonMax: 2, twoStarChance: 0.3, spaceChance: 0.1,
  },
  {
    id: "Mushroom",
    nouns: ["Hollow", "Spores", "Fen", "Thicket", "Grotto", "Mire"],
    skyHue: 275, landHue: 265, accentHue: 300,
    landSat: 0.38, landLight: 0.5, skySat: 0.5, skyLight: 0.55,
    cloudiness: [0.4, 0.7], amplitude: [0.8, 1.4], frequency: [1.1, 1.7],
    ruggedness: [0.1, 0.4], seaChance: 0.55, sunIntensity: [0.85, 1.05],
    flowerHues: [300, 320, 180, 90],
    layers: [
      { kind: "mushrooms", density: 1.4 }, { kind: "tufts", density: 1.0 },
      { kind: "flowers", density: 1.0 }, { kind: "pebbles", density: 0.6 },
      { kind: "rocks", density: 0.4 },
    ],
    decoration: "mushrooms", ruinsChance: 0.7, isletsChance: 0.95,
    ringChance: 0.25, moonChance: 0.6, moonMax: 2, twoStarChance: 0.15, spaceChance: 0.1,
  },
  {
    id: "Coral",
    nouns: ["Atoll", "Reef", "Lagoon", "Shoal", "Cove", "Tide"],
    skyHue: 192, landHue: 175, accentHue: 350,
    landSat: 0.45, landLight: 0.66, skySat: 0.58, skyLight: 0.78,
    cloudiness: [0.45, 0.8], amplitude: [0.7, 1.2], frequency: [1.1, 1.7],
    ruggedness: [0.0, 0.3], seaChance: 0.95, sunIntensity: [1.0, 1.2],
    flowerHues: [350, 20, 300, 50],
    layers: [
      { kind: "spires", density: 0.9 }, { kind: "flowers", density: 1.1 },
      { kind: "tufts", density: 0.8 }, { kind: "rocks", density: 0.6 },
      { kind: "reeds", density: 0.7 },
    ],
    decoration: "spires", ruinsChance: 0.6, isletsChance: 0.85,
    ringChance: 0.2, moonChance: 0.5, moonMax: 1, twoStarChance: 0.1, spaceChance: 0,
  },
  {
    id: "Lavender",
    nouns: ["Heath", "Field", "Vale", "Moor", "Wold", "Reverie"],
    skyHue: 258, landHue: 282, accentHue: 320,
    landSat: 0.4, landLight: 0.62, skySat: 0.5, skyLight: 0.72,
    cloudiness: [0.5, 0.8], amplitude: [0.7, 1.2], frequency: [1.2, 1.8],
    ruggedness: [0.0, 0.3], seaChance: 0.35, sunIntensity: [0.95, 1.15],
    flowerHues: [285, 320, 260, 50],
    layers: [
      { kind: "tufts", density: 1.5 }, { kind: "flowers", density: 1.6 },
      { kind: "blossoms", density: 0.7 }, { kind: "pebbles", density: 0.5 },
      { kind: "rocks", density: 0.35 },
    ],
    decoration: "blossoms", ruinsChance: 0.8, isletsChance: 0.9,
    ringChance: 0.3, moonChance: 0.6, moonMax: 2, twoStarChance: 0.2, spaceChance: 0.1,
  },
  {
    id: "Ember",
    nouns: ["Ember", "Cinder", "Ridge", "Caldera", "Forge", "Glow"],
    skyHue: 18, landHue: 8, accentHue: 35,
    landSat: 0.42, landLight: 0.5, skySat: 0.6, skyLight: 0.62,
    cloudiness: [0.3, 0.6], amplitude: [1.2, 2.1], frequency: [1.1, 1.8],
    ruggedness: [0.4, 0.8], seaChance: 0.2, sunIntensity: [1.0, 1.25],
    flowerHues: [35, 15, 50, 0],
    layers: [
      { kind: "crystals", density: 1.2 }, { kind: "rocks", density: 1.0 },
      { kind: "spires", density: 0.7 }, { kind: "pebbles", density: 0.8 },
      { kind: "tufts", density: 0.3 },
    ],
    decoration: "crystals", ruinsChance: 0.85, isletsChance: 0.85,
    ringChance: 0.35, moonChance: 0.6, moonMax: 2, twoStarChance: 0.3, spaceChance: 0.15,
  },
  // ---- new world types ----
  {
    id: "Forest",
    nouns: ["Woods", "Forest", "Canopy", "Wildwood", "Timber", "Glen"],
    skyHue: 150, landHue: 120, accentHue: 70,
    landSat: 0.5, landLight: 0.5, skySat: 0.5, skyLight: 0.72,
    cloudiness: [0.5, 0.85], amplitude: [0.9, 1.6], frequency: [1.2, 1.8],
    ruggedness: [0.1, 0.4], seaChance: 0.45, sunIntensity: [0.95, 1.15],
    flowerHues: [55, 0, 280, 320],
    layers: [
      { kind: "trees", density: 1.5 }, { kind: "tufts", density: 1.4 },
      { kind: "flowers", density: 0.9 }, { kind: "mushrooms", density: 0.5 },
      { kind: "rocks", density: 0.4 }, { kind: "pebbles", density: 0.5 },
    ],
    decoration: "trees", ruinsChance: 0.85, isletsChance: 0.85,
    ringChance: 0.2, moonChance: 0.6, moonMax: 1, twoStarChance: 0.1, spaceChance: 0,
  },
  {
    id: "Ocean",
    nouns: ["Ocean", "Sea", "Expanse", "Deeps", "Brine", "Swell"],
    skyHue: 205, landHue: 165, accentHue: 45,
    landSat: 0.45, landLight: 0.66, skySat: 0.62, skyLight: 0.8,
    cloudiness: [0.5, 0.9], amplitude: [0.5, 0.95], frequency: [1.0, 1.5],
    ruggedness: [0.0, 0.2], seaChance: 1, sunIntensity: [1.05, 1.25],
    flowerHues: [50, 0, 320, 190],
    layers: [
      { kind: "palms", density: 1.1 }, { kind: "tufts", density: 0.9 },
      { kind: "flowers", density: 0.7 }, { kind: "rocks", density: 0.5 },
      { kind: "reeds", density: 1.0 },
    ],
    decoration: "palms", ruinsChance: 0.6, isletsChance: 0.8,
    ringChance: 0.25, moonChance: 0.7, moonMax: 2, twoStarChance: 0.15, spaceChance: 0,
  },
  {
    id: "Barren",
    nouns: ["Rock", "Crater", "Husk", "Lode", "Scree", "Stone"],
    skyHue: 230, landHue: 30, accentHue: 28,
    landSat: 0.12, landLight: 0.46, skySat: 0.4, skyLight: 0.3,
    cloudiness: [0.0, 0.2], amplitude: [1.4, 2.4], frequency: [1.2, 2.0],
    ruggedness: [0.45, 0.85], seaChance: 0, sunIntensity: [1.1, 1.35],
    flowerHues: [30, 20],
    layers: [
      { kind: "craters", density: 1.2 }, { kind: "rocks", density: 1.4 },
      { kind: "pebbles", density: 1.2 }, { kind: "spires", density: 0.5 },
      { kind: "crystals", density: 0.4 },
    ],
    decoration: "crystals", ruinsChance: 0.7, isletsChance: 0.95,
    ringChance: 0.7, moonChance: 0.9, moonMax: 3, twoStarChance: 0.5, spaceChance: 1,
  },
  {
    id: "Metropolis",
    nouns: ["Citadel", "Spires", "Borough", "Haven", "Quarter", "Roost"],
    skyHue: 220, landHue: 140, accentHue: 40,
    landSat: 0.32, landLight: 0.56, skySat: 0.55, skyLight: 0.6,
    cloudiness: [0.3, 0.6], amplitude: [0.7, 1.2], frequency: [1.1, 1.6],
    ruggedness: [0.0, 0.25], seaChance: 0.4, sunIntensity: [0.95, 1.15],
    flowerHues: [45, 0, 320, 200],
    layers: [
      { kind: "houses", density: 1.3 }, { kind: "lamps", density: 0.9 },
      { kind: "tufts", density: 1.0 }, { kind: "flowers", density: 0.8 },
      { kind: "trees", density: 0.5 }, { kind: "pebbles", density: 0.5 },
    ],
    decoration: "houses", ruinsChance: 0.5, isletsChance: 0.85,
    ringChance: 0.3, moonChance: 0.8, moonMax: 2, twoStarChance: 0.2, spaceChance: 0.25,
  },
  {
    id: "Machina",
    nouns: ["Machine", "Foundry", "Circuit", "Engine", "Array", "Cog"],
    skyHue: 265, landHue: 250, accentHue: 175,
    landSat: 0.18, landLight: 0.34, skySat: 0.5, skyLight: 0.32,
    cloudiness: [0.1, 0.35], amplitude: [1.0, 1.8], frequency: [1.2, 1.9],
    ruggedness: [0.3, 0.7], seaChance: 0.1, sunIntensity: [0.9, 1.1],
    flowerHues: [175, 300, 200],
    layers: [
      { kind: "panels", density: 1.1 }, { kind: "gears", density: 1.0 },
      { kind: "lamps", density: 1.0 }, { kind: "rocks", density: 0.7 },
      { kind: "spires", density: 0.6 },
    ],
    decoration: "panels", ruinsChance: 0.6, isletsChance: 0.95,
    ringChance: 0.6, moonChance: 0.8, moonMax: 3, twoStarChance: 0.45, spaceChance: 1,
  },
];

function buildSuns(rng: Rng, skyH: number, intensity: number): StarConfig[] {
  const dir1: [number, number, number] = [
    rng.range(-0.5, 0.5),
    rng.range(0.4, 1),
    rng.range(-0.5, 0.5),
  ];
  const suns: StarConfig[] = [
    {
      color: hslToHex(skyH + 40, 0.4, 0.92),
      intensity,
      dir: dir1,
      size: rng.range(7, 11),
    },
  ];
  return suns;
}

export function makePlanetTheme(index: number, baseSeed: number): PlanetTheme {
  const seed = mixSeed(baseSeed, index * 2654435761);
  const rng = new Rng(seed);

  const biome =
    index < BIOMES.length
      ? BIOMES[index]
      : BIOMES[rng.int(0, BIOMES.length - 1)];

  const jit = (d: number) => rng.range(-d, d);
  const skyH = biome.skyHue + jit(10);
  const landH = biome.landHue + jit(10);
  const accH = biome.accentHue + jit(12);

  const name = `${rng.pick(ADJECTIVES)} ${rng.pick(biome.nouns)}`;

  const space = rng.chance(biome.spaceChance);

  // Sky gradient. Space worlds get a deep, dark cosmic sky.
  let skyTop: string, skyHorizon: string, skyBottom: string, fog: string;
  let cloudColor: string, fogDensity: number;
  if (space) {
    skyTop = hslToHex(skyH, 0.6, 0.06);
    skyHorizon = hslToHex(skyH + 14, 0.55, 0.16);
    skyBottom = hslToHex(skyH + 24, 0.5, 0.1);
    fog = hslToHex(skyH + 10, 0.5, 0.08);
    cloudColor = hslToHex(skyH + 20, 0.4, 0.5);
    fogDensity = 0.008;
  } else {
    skyTop = hslToHex(skyH, biome.skySat, biome.skyLight - 0.06);
    skyHorizon = hslToHex(skyH + 16, biome.skySat * 0.95, biome.skyLight + 0.12);
    skyBottom = hslToHex(skyH + 30, biome.skySat * 0.85, biome.skyLight + 0.2);
    fog = hslToHex(skyH + 18, biome.skySat * 0.6, biome.skyLight + 0.16);
    cloudColor = hslToHex(skyH + 24, 0.3, 0.96);
    fogDensity = 0.012;
  }

  const lL = biome.landLight;
  const lS = biome.landSat;
  const sea = hslToHex(landH + 40, lS * 0.9, lL + 0.16);
  const terrainLow = hslToHex(landH + 4, lS, lL + 0.06);
  const terrainMid = hslToHex(landH, lS * 1.02, lL - 0.02);
  const terrainHigh = hslToHex(landH - 6, lS * 0.92, lL - 0.1);
  const terrainPeak = hslToHex(landH - 12, lS * 0.5, Math.min(0.92, lL + 0.24));

  const accent = hslToHex(accH, rng.range(0.78, 0.92), rng.range(0.6, 0.7));
  const accent2 = hslToHex(accH + 28, rng.range(0.72, 0.88), rng.range(0.66, 0.76));

  const flowerColors = biome.flowerHues.map((h) =>
    hslToHex(h + jit(6), rng.range(0.75, 0.95), rng.range(0.66, 0.78)),
  );
  const rockColor = hslToHex(landH - 18, 0.14, biome.landLight - 0.16);
  const tuftColor = hslToHex(landH - 8, lS * 1.05, lL - 0.16);
  const structureColor = hslToHex(landH - 10, 0.18, biome.landLight + 0.08);

  const ambientColor = hslToHex(skyH + 10, 0.4, space ? 0.45 : 0.82);
  const sunIntensity = rng.range(biome.sunIntensity[0], biome.sunIntensity[1]);
  const sunColor = hslToHex(skyH + 40, 0.35, 0.94);

  // Suns (one, or a contrasting pair for double-star systems).
  const suns = buildSuns(rng, skyH, sunIntensity);
  if (rng.chance(biome.twoStarChance)) {
    suns.push({
      color: hslToHex(skyH + 180 + jit(30), 0.6, 0.78), // complementary tint
      intensity: sunIntensity * rng.range(0.4, 0.7),
      dir: [rng.range(-1, 1), rng.range(-0.2, 0.6), rng.range(-1, 1)],
      size: rng.range(5, 8),
    });
  }

  // Rings.
  const baseR = 10 + rng.range(biome.amplitude[0], biome.amplitude[1]);
  let rings: RingConfig | null = null;
  if (rng.chance(biome.ringChance)) {
    const inner = baseR + rng.range(2.5, 4.5);
    rings = {
      color: hslToHex(accH + jit(20), 0.5, 0.78),
      color2: hslToHex(landH + jit(20), 0.4, 0.7),
      inner,
      outer: inner + rng.range(3, 7),
      tilt: rng.range(0.25, 1.05) * (rng.chance(0.5) ? 1 : -1),
    };
  }

  // Moons.
  const moons: MoonConfig[] = [];
  if (rng.chance(biome.moonChance)) {
    const n = rng.int(1, biome.moonMax);
    for (let i = 0; i < n; i++) {
      const glow = rng.chance(0.25);
      moons.push({
        color: glow
          ? hslToHex(accH + jit(30), 0.6, 0.7)
          : hslToHex(landH + jit(40), 0.18, rng.range(0.5, 0.8)),
        emissive: glow ? hslToHex(accH + jit(30), 0.7, 0.6) : null,
        size: rng.range(0.7, 2.2),
        dist: baseR + rng.range(6, 18),
        speed: rng.range(0.04, 0.12) * (rng.chance(0.5) ? 1 : -1),
        tiltX: rng.range(-0.6, 0.6),
        tiltZ: rng.range(-0.6, 0.6),
        phase: rng.range(0, Math.PI * 2),
      });
    }
  }

  const hasSea = rng.chance(biome.seaChance);

  // Atmospheric flourishes (drawn last so earlier worlds keep their identity).
  const auroraBase =
    biome.id === "Tundra"
      ? 0.75
      : biome.id === "Machina"
        ? 0.65
        : space
          ? 0.55
          : biome.id === "Lavender"
            ? 0.4
            : 0.12;
  const aurora = rng.chance(auroraBase);
  const auroraColor = hslToHex(accH + jit(20), 0.75, 0.62);
  const auroraColor2 = hslToHex(skyH + 130 + jit(40), 0.72, 0.62);
  const hasComets = space ? true : rng.chance(0.25);

  return {
    index,
    seed,
    name,
    biome: biome.id,
    skyTop,
    skyHorizon,
    skyBottom,
    fog,
    fogDensity,
    cloudColor,
    cloudiness: space
      ? rng.range(0, 0.2)
      : rng.range(biome.cloudiness[0], biome.cloudiness[1]),
    sea,
    terrainLow,
    terrainMid,
    terrainHigh,
    terrainPeak,
    hasSea,
    seaLevel: hasSea ? rng.range(0.34, 0.46) : 0,
    accent,
    accent2,
    flowerColors,
    rockColor,
    tuftColor,
    structureColor,
    ambientColor,
    sunColor,
    sunIntensity,
    suns,
    amplitude: rng.range(biome.amplitude[0], biome.amplitude[1]),
    frequency: rng.range(biome.frequency[0], biome.frequency[1]),
    ruggedness: rng.range(biome.ruggedness[0], biome.ruggedness[1]),
    decoration: biome.decoration,
    decoDensity: rng.range(0.85, 1.2),
    layers: biome.layers,
    hasRuins: rng.chance(biome.ruinsChance),
    hasIslets: rng.chance(biome.isletsChance),
    rings,
    moons,
    space,
    starColor: hslToHex(skyH + 30, 0.3, 0.95),
    aurora,
    auroraColor,
    auroraColor2,
    hasComets,
  };
}
