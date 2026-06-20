// Procedural pastel palettes. Each planet's whole look is derived from its seed:
// sky gradient, terrain elevation ramp, sea, fog, lighting and accent glows.
// We anchor hues to curated "archetypes" and jitter within them, so every world
// is distinct yet always lands in a pleasant anime-pastel range.

import { Rng, mixSeed } from "./rng";

export type DecoKind = "crystals" | "pines" | "mushrooms" | "blossoms" | "spires";

export interface PlanetTheme {
  index: number;
  seed: number;
  name: string;

  // Sky dome gradient (top -> horizon -> bottom)
  skyTop: string;
  skyHorizon: string;
  skyBottom: string;
  fog: string;

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

  // Lighting hints
  ambientColor: string;
  sunColor: string;
  sunIntensity: number;

  // Terrain shape
  amplitude: number; // peak displacement above base radius
  frequency: number; // noise frequency
  ruggedness: number; // 0 = rolling hills, 1 = ridged/jagged

  decoration: DecoKind;
  decoDensity: number;
}

// Hue families (degrees) for sky / land / accent. Curated to stay pastel-friendly.
const ARCHETYPES: { name: string; sky: number; land: number; accent: number }[] = [
  { name: "Cotton Candy", sky: 320, land: 150, accent: 45 },
  { name: "Sky Lagoon", sky: 230, land: 185, accent: 12 },
  { name: "Peach Dream", sky: 25, land: 110, accent: 280 },
  { name: "Lavender Field", sky: 270, land: 135, accent: 330 },
  { name: "Mint Aurora", sky: 195, land: 265, accent: 30 },
  { name: "Bubblegum Sea", sky: 210, land: 330, accent: 55 },
  { name: "Sherbet Coast", sky: 350, land: 175, accent: 90 },
  { name: "Periwinkle Hills", sky: 250, land: 160, accent: 20 },
];

const ADJECTIVES = [
  "Velvet", "Drowsy", "Pastel", "Misty", "Dreamy", "Sugar", "Hazy", "Gentle",
  "Whisper", "Marsh", "Cloud", "Twilight", "Cozy", "Silken", "Glimmer", "Sleepy",
];
const NOUNS = [
  "Marshmallow", "Lagoon", "Meadow", "Blossom", "Hollow", "Drift", "Haven",
  "Petal", "Sorbet", "Lull", "Nimbus", "Pebble", "Mochi", "Reverie", "Dewdrop",
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

const DECOS: DecoKind[] = ["crystals", "pines", "mushrooms", "blossoms", "spires"];

export function makePlanetTheme(index: number, baseSeed: number): PlanetTheme {
  const seed = mixSeed(baseSeed, index * 2654435761);
  const rng = new Rng(seed);

  const arch = ARCHETYPES[rng.int(0, ARCHETYPES.length - 1)];
  const jitter = () => rng.range(-12, 12);

  const skyH = arch.sky + jitter();
  const landH = arch.land + jitter();
  const accH = arch.accent + jitter();

  const name = `${rng.pick(ADJECTIVES)} ${rng.pick(NOUNS)}`;

  // Sky: airy gradient with enough colour to read as pastel (not washed white).
  const skyTop = hslToHex(skyH, rng.range(0.5, 0.66), rng.range(0.6, 0.68));
  const skyHorizon = hslToHex(skyH + 18, rng.range(0.55, 0.7), rng.range(0.78, 0.85));
  const skyBottom = hslToHex(skyH + 35, rng.range(0.5, 0.65), rng.range(0.85, 0.9));
  const fog = hslToHex(skyH + 20, 0.5, 0.85);

  // Terrain ramp.
  const sea = hslToHex(landH + 30, rng.range(0.45, 0.6), rng.range(0.78, 0.86));
  const terrainLow = hslToHex(landH, rng.range(0.4, 0.55), rng.range(0.72, 0.8));
  const terrainMid = hslToHex(landH - 6, rng.range(0.42, 0.58), rng.range(0.64, 0.72));
  const terrainHigh = hslToHex(landH - 14, rng.range(0.38, 0.5), rng.range(0.58, 0.68));
  const terrainPeak = hslToHex(landH - 20, rng.range(0.25, 0.4), rng.range(0.82, 0.92));

  const accent = hslToHex(accH, rng.range(0.7, 0.9), rng.range(0.62, 0.72));
  const accent2 = hslToHex(accH + 30, rng.range(0.65, 0.85), rng.range(0.68, 0.78));

  const ambientColor = hslToHex(skyH + 10, 0.4, 0.8);
  const sunColor = hslToHex(skyH + 40, 0.35, 0.92);

  const hasSea = rng.chance(0.6);

  return {
    index,
    seed,
    name,
    skyTop,
    skyHorizon,
    skyBottom,
    fog,
    sea,
    terrainLow,
    terrainMid,
    terrainHigh,
    terrainPeak,
    hasSea,
    seaLevel: hasSea ? rng.range(0.34, 0.46) : 0,
    accent,
    accent2,
    ambientColor,
    sunColor,
    sunIntensity: rng.range(0.85, 1.15),
    amplitude: rng.range(0.7, 1.5),
    frequency: rng.range(1.1, 2.0),
    ruggedness: rng.range(0.0, 0.7),
    decoration: DECOS[index % DECOS.length] === undefined ? "pines" : rng.pick(DECOS),
    decoDensity: rng.range(0.7, 1.25),
  };
}
