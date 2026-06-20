import * as THREE from "three";
import { SimplexNoise } from "./noise";
import { Rng } from "./rng";
import { makePlanetTheme, PlanetTheme } from "./theme";

// Fixed universe seed: planet N is identical on every device, so a share code
// only needs to carry the planet index.
export const WORLD_SEED = 0x5f17b0a1;

export const PLANET_RADIUS = 10;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export interface ScatterPoint {
  dir: THREE.Vector3; // unit direction
  pos: THREE.Vector3; // world position on the surface
  elevation: number; // normalized 0..1
}

export class Planet {
  readonly index: number;
  readonly theme: PlanetTheme;
  readonly radius = PLANET_RADIUS;
  readonly waterRadius: number;
  private noise: SimplexNoise;

  // reused scratch vectors
  private _v = new THREE.Vector3();

  // cached gradient color stops
  private stops: { t: number; c: THREE.Color }[];
  private seaColor: THREE.Color;

  constructor(index: number) {
    this.index = index;
    this.theme = makePlanetTheme(index, WORLD_SEED);
    this.noise = new SimplexNoise(this.theme.seed ^ 0xa53);
    this.waterRadius = this.theme.hasSea
      ? this.radius + this.theme.seaLevel * this.theme.amplitude * 0.94
      : 0;

    const th = this.theme;
    this.stops = [
      { t: 0.0, c: new THREE.Color(th.terrainLow) },
      { t: 0.4, c: new THREE.Color(th.terrainMid) },
      { t: 0.72, c: new THREE.Color(th.terrainHigh) },
      { t: 1.0, c: new THREE.Color(th.terrainPeak) },
    ];
    this.seaColor = new THREE.Color(th.sea);
  }

  /** Normalized terrain elevation 0..1 for a unit direction (pre-sea-flatten). */
  elevationRaw(dir: THREE.Vector3): number {
    const th = this.theme;
    const f = th.frequency;
    const n = this.noise.fbm(dir.x * f, dir.y * f, dir.z * f, 5, 2.0, 0.5);
    let e = n * 0.5 + 0.5; // 0..1
    const ridged = 1 - Math.abs(n); // ridge highlights
    e = lerp(e, ridged, th.ruggedness);
    // gently flatten lowlands so worlds feel like rolling meadows, not spikes
    e = smoothstep(0.05, 0.95, e);
    return e;
  }

  /** Terrain displacement above base radius (with sea floor flattening). */
  displacement(dir: THREE.Vector3): number {
    const th = this.theme;
    let e = this.elevationRaw(dir);
    if (th.hasSea && e < th.seaLevel) {
      // mostly flat sea floor with a soft dip
      e = th.seaLevel - (th.seaLevel - e) * 0.22;
    }
    return e * th.amplitude;
  }

  /** World-space radius of the walkable surface for a unit direction. */
  surfaceRadius(dir: THREE.Vector3): number {
    return this.radius + this.displacement(dir);
  }

  /** Radius the character should rest at (floats on water). */
  standRadius(dir: THREE.Vector3): number {
    const s = this.surfaceRadius(dir);
    return this.theme.hasSea ? Math.max(s, this.waterRadius) : s;
  }

  private colorForElevation(eRaw: number, target: THREE.Color) {
    const th = this.theme;
    if (th.hasSea && eRaw < th.seaLevel) {
      target.copy(this.seaColor);
      return;
    }
    const t = th.hasSea ? (eRaw - th.seaLevel) / (1 - th.seaLevel) : eRaw;
    const tt = Math.max(0, Math.min(1, t));
    let lo = this.stops[0];
    let hi = this.stops[this.stops.length - 1];
    for (let i = 0; i < this.stops.length - 1; i++) {
      if (tt >= this.stops[i].t && tt <= this.stops[i + 1].t) {
        lo = this.stops[i];
        hi = this.stops[i + 1];
        break;
      }
    }
    const span = hi.t - lo.t || 1;
    target.copy(lo.c).lerp(hi.c, (tt - lo.t) / span);
  }

  /**
   * Build a faceted (flat-shaded) low-poly planet mesh. Non-indexed icosphere,
   * displaced by terrain, with crisp per-face pastel colors.
   */
  buildGeometry(detail: number): THREE.BufferGeometry {
    const base = new THREE.IcosahedronGeometry(this.radius, detail);
    const pos = base.attributes.position as THREE.BufferAttribute;
    const count = pos.count;
    const colors = new Float32Array(count * 3);

    const dirA = new THREE.Vector3();
    const dirB = new THREE.Vector3();
    const dirC = new THREE.Vector3();
    const centroid = new THREE.Vector3();
    const col = new THREE.Color();

    for (let i = 0; i < count; i += 3) {
      dirA.fromBufferAttribute(pos, i).normalize();
      dirB.fromBufferAttribute(pos, i + 1).normalize();
      dirC.fromBufferAttribute(pos, i + 2).normalize();

      const rA = this.surfaceRadius(dirA);
      const rB = this.surfaceRadius(dirB);
      const rC = this.surfaceRadius(dirC);

      pos.setXYZ(i, dirA.x * rA, dirA.y * rA, dirA.z * rA);
      pos.setXYZ(i + 1, dirB.x * rB, dirB.y * rB, dirB.z * rB);
      pos.setXYZ(i + 2, dirC.x * rC, dirC.y * rC, dirC.z * rC);

      centroid.copy(dirA).add(dirB).add(dirC).normalize();
      this.colorForElevation(this.elevationRaw(centroid), col);

      for (let k = 0; k < 3; k++) {
        colors[(i + k) * 3] = col.r;
        colors[(i + k) * 3 + 1] = col.g;
        colors[(i + k) * 3 + 2] = col.b;
      }
    }

    base.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    base.computeVertexNormals(); // flat normals (non-indexed) -> faceted look
    base.computeBoundingSphere();
    return base;
  }

  /**
   * Roughly uniform scatter of points on the sphere (seeded golden spiral with a
   * jittered rotation). Optionally keep only land points above the sea.
   */
  scatter(
    count: number,
    seed: number,
    landOnly = true,
    avoidDir?: THREE.Vector3,
    avoidCos = 0.94,
  ): ScatterPoint[] {
    const rng = new Rng(seed);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const rot = rng.range(0, Math.PI * 2);
    // Oversample across the WHOLE sphere, collect every point that passes the
    // filters, then evenly downsample to `count`. (Iterating the spiral and
    // stopping at `count` would bunch everything near the top pole and leave
    // most of the planet bare.)
    const total = landOnly || avoidDir ? count * 6 : count;
    const candidates: THREE.Vector3[] = [];
    for (let i = 0; i < total; i++) {
      const y = 1 - ((i + 0.5) / total) * 2; // 1..-1
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i + rot;
      const dir = new THREE.Vector3(
        Math.cos(theta) * r,
        y,
        Math.sin(theta) * r,
      ).normalize();
      // jitter a little so it never looks like a strict spiral
      dir.x += rng.range(-0.05, 0.05);
      dir.y += rng.range(-0.05, 0.05);
      dir.z += rng.range(-0.05, 0.05);
      dir.normalize();

      // keep a clear cap around the spawn point so nothing is auto-collected
      if (avoidDir && dir.dot(avoidDir) > avoidCos) continue;
      const eRaw = this.elevationRaw(dir);
      if (landOnly && this.theme.hasSea && eRaw < this.theme.seaLevel + 0.04) {
        continue;
      }
      candidates.push(dir);
    }

    // evenly pick `count` from the full-sphere candidate list
    const out: ScatterPoint[] = [];
    const n = Math.min(count, candidates.length);
    const stride = candidates.length / Math.max(1, n);
    for (let k = 0; k < n; k++) {
      const dir = candidates[Math.floor(k * stride)];
      const sr = this.standRadius(dir);
      out.push({
        dir: dir.clone(),
        pos: dir.clone().multiplyScalar(sr),
        elevation: this.elevationRaw(dir),
      });
    }
    return out;
  }

  /** Find the highest point among a sampling — used for "summit" quests. */
  highestPoint(samples = 600, seed = 1): ScatterPoint {
    const pts = this.scatter(samples, seed, false);
    let best = pts[0];
    for (const p of pts) if (p.elevation > best.elevation) best = p;
    void this._v;
    return best;
  }
}

const cache = new Map<number, Planet>();
export function getPlanet(index: number): Planet {
  let p = cache.get(index);
  if (!p) {
    p = new Planet(index);
    cache.set(index, p);
  }
  return p;
}
