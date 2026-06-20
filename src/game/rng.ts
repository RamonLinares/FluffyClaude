// Tiny, fast, deterministic PRNG utilities.
// Everything that should look "random" but stay reproducible across devices
// flows through here, seeded from an integer.

/** mulberry32 — a compact 32-bit seeded PRNG. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic string -> 32-bit hash (xfnv1a). Used to derive seeds from text. */
export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mix two integers into a new well-distributed seed. */
export function mixSeed(a: number, b: number): number {
  let h = (a ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (b + 0x85ebca6b), 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** A convenience random object built on a seed. */
export class Rng {
  private next: () => number;
  constructor(seed: number) {
    this.next = mulberry32(seed >>> 0);
  }
  /** float in [0, 1) */
  float(): number {
    return this.next();
  }
  /** float in [min, max) */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
  /** integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
  /** pick a random element */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  /** true with probability p */
  chance(p: number): boolean {
    return this.next() < p;
  }
}
