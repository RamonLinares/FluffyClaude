import { ReactNode, useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Planet, ScatterPoint } from "../game/planet";
import { DecoKind } from "../game/theme";
import { Rng, mixSeed } from "../game/rng";
import { addColliders, Collider } from "../game/colliders";

// Footprint radius for the big prop kinds the player should bump into. Kinds not
// listed here (flowers, tufts, pebbles, rocks, lamps…) are walk-through. Kept
// fairly small so you can weave between obstacles.
const COLLIDE_RADIUS: Partial<Record<DecoKind, number>> = {
  trees: 0.42,
  pines: 0.38,
  palms: 0.34,
  spires: 0.3,
  houses: 0.55,
  robots: 0.3,
  antennas: 0.28,
  panels: 0.4,
  stalls: 0.4,
  crystals: 0.36,
};

// Collidable props are thinned out vs. the lush (walk-through) ground cover, so
// every world keeps clear lanes to move through.
const COLLIDE_COUNT_SCALE = 0.55;

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Instanced prop: places `geometry`+`material` at every scatter point, oriented
 * to the surface normal with a random yaw and per-instance scale. A single draw
 * call no matter how many instances, so we can carpet a planet cheaply.
 */
function InstancedProp({
  points,
  seed,
  scaleMin,
  scaleMax,
  baseLift,
  geometry,
  material,
  sink = 0,
  lean = 0,
  cast = true,
}: {
  points: ScatterPoint[];
  seed: number;
  scaleMin: number;
  scaleMax: number;
  baseLift: number; // local +Y distance from origin to the base at scale 1
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  sink?: number;
  lean?: number; // random tilt off the normal (radians), for organic clumps
  cast?: boolean;
}) {
  const matrices = useMemo(() => {
    const rng = new Rng(seed);
    const qDir = new THREE.Quaternion();
    const qYaw = new THREE.Quaternion();
    const qLean = new THREE.Quaternion();
    const q = new THREE.Quaternion();
    const leanAxis = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const pos = new THREE.Vector3();
    const out: THREE.Matrix4[] = [];
    for (const p of points) {
      const sc = rng.range(scaleMin, scaleMax);
      qDir.setFromUnitVectors(UP, p.dir);
      qYaw.setFromAxisAngle(p.dir, rng.range(0, Math.PI * 2));
      q.multiplyQuaternions(qYaw, qDir);
      if (lean > 0) {
        leanAxis.set(rng.range(-1, 1), 0, rng.range(-1, 1)).normalize();
        qLean.setFromAxisAngle(leanAxis, rng.range(-lean, lean));
        q.multiply(qLean);
      }
      pos.copy(p.dir).multiplyScalar(p.pos.length() + baseLift * sc - sink);
      scale.set(sc, sc, sc);
      out.push(new THREE.Matrix4().compose(pos, q, scale));
    }
    return out;
  }, [points, seed, scaleMin, scaleMax, baseLift, sink, lean]);

  const ref = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    for (let i = 0; i < matrices.length; i++) mesh.setMatrixAt(i, matrices[i]);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
  };

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, matrices.length]}
      frustumCulled={false}
    />
  );
}

// ---- geometry factories (memoized per planet) -----------------------------

function crystalCluster(rng: Rng, shards: number): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < shards; i++) {
    const g = new THREE.OctahedronGeometry(rng.range(0.22, 0.42), 0);
    const h = rng.range(1.4, 2.4); // stretch into a shard
    g.scale(0.7, h, 0.7);
    const a = (i / shards) * Math.PI * 2 + rng.range(-0.4, 0.4);
    const r = i === 0 ? 0 : rng.range(0.12, 0.34);
    g.translate(
      Math.cos(a) * r,
      rng.range(-0.05, 0.15) + (i === 0 ? 0.12 : 0),
      Math.sin(a) * r,
    );
    g.rotateX(rng.range(-0.3, 0.3));
    g.rotateZ(rng.range(-0.3, 0.3));
    geos.push(g);
  }
  return mergeGeometries(geos, false) ?? geos[0];
}

function bloom(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(0.14, 0);
  g.scale(1, 0.42, 1);
  return g;
}

function tuft(): THREE.BufferGeometry {
  // a little fan of 3 blades
  const blade = () => {
    const b = new THREE.ConeGeometry(0.045, 0.34, 4);
    return b;
  };
  const a = blade();
  a.translate(0, 0.17, 0);
  const b = blade();
  b.rotateZ(0.35);
  b.translate(0.07, 0.15, 0);
  const c = blade();
  c.rotateZ(-0.35);
  c.translate(-0.07, 0.15, 0);
  return mergeGeometries([a, b, c], false) ?? a;
}

function mushroomCap(): THREE.BufferGeometry {
  return new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
}

// A drooping crown of palm fronds, baked into one geometry.
function palmCrown(): THREE.BufferGeometry {
  const fronds: THREE.BufferGeometry[] = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const f = new THREE.ConeGeometry(0.12, 0.95, 4);
    f.translate(0, 0.47, 0); // base at origin
    f.rotateZ(-Math.PI / 2 + 0.5); // point outward & droop down
    f.rotateY((i / n) * Math.PI * 2);
    fronds.push(f);
  }
  return mergeGeometries(fronds, false) ?? fronds[0];
}

// A chunky cog: a hub disc ringed with rectangular teeth.
function gear(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const hub = new THREE.CylinderGeometry(0.34, 0.34, 0.16, 16);
  hub.rotateX(Math.PI / 2); // lay flat-ish facing camera
  parts.push(hub);
  const teeth = 8;
  for (let i = 0; i < teeth; i++) {
    const t = new THREE.BoxGeometry(0.13, 0.13, 0.18);
    const a = (i / teeth) * Math.PI * 2;
    t.translate(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0);
    t.rotateZ(a);
    parts.push(t);
  }
  return mergeGeometries(parts, false) ?? hub;
}

// A shallow crater rim ring lying flat on the ground.
function crater(): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(0.55, 0.16, 5, 14);
  g.rotateX(Math.PI / 2);
  g.scale(1, 0.35, 1);
  return g;
}

// A boxy little robot: body, head, legs, arms and an antenna, merged.
function robot(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.BoxGeometry(0.42, 0.46, 0.32);
  body.translate(0, 0.5, 0);
  parts.push(body);
  const head = new THREE.BoxGeometry(0.3, 0.28, 0.3);
  head.translate(0, 0.87, 0);
  parts.push(head);
  const legL = new THREE.BoxGeometry(0.13, 0.3, 0.13);
  legL.translate(-0.12, 0.15, 0);
  parts.push(legL);
  const legR = new THREE.BoxGeometry(0.13, 0.3, 0.13);
  legR.translate(0.12, 0.15, 0);
  parts.push(legR);
  const armL = new THREE.BoxGeometry(0.1, 0.3, 0.1);
  armL.translate(-0.3, 0.52, 0);
  parts.push(armL);
  const armR = new THREE.BoxGeometry(0.1, 0.3, 0.1);
  armR.translate(0.3, 0.52, 0);
  parts.push(armR);
  const ant = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 5);
  ant.translate(0, 1.1, 0);
  parts.push(ant);
  return mergeGeometries(parts, false) ?? body;
}

// A stack of three balanced stones.
function cairn(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const sizes = [0.26, 0.2, 0.14];
  let y = 0;
  for (const s of sizes) {
    const r = new THREE.DodecahedronGeometry(s, 0);
    y += s;
    r.translate(0, y, 0);
    r.scale(1, 0.8, 1);
    y += s * 0.65;
    parts.push(r);
  }
  return mergeGeometries(parts, false) ?? parts[0];
}

// ---------------------------------------------------------------------------

export function Decorations({
  planet,
  quality,
}: {
  planet: Planet;
  quality: "low" | "high";
}) {
  const th = planet.theme;
  const hi = quality === "high";
  // base count per "1.0 density" layer for props (trees, crystals, mushrooms…)
  const base = Math.round((hi ? 120 : 78) * th.decoDensity);
  // Ground cover (grass/flowers/pebbles) needs to be FAR denser than props to
  // read as a carpet. These layers are cheap (no shadows, tiny instanced geo),
  // so they get a big dedicated budget instead of the prop `base`.
  const coverCount: Partial<Record<DecoKind, number>> = {
    tufts: Math.round((hi ? 1500 : 750) * th.decoDensity),
    flowers: Math.round((hi ? 750 : 400) * th.decoDensity),
    pebbles: Math.round((hi ? 420 : 230) * th.decoDensity),
    reeds: Math.round((hi ? 320 : 180) * th.decoDensity),
  };

  // shared geometries / materials (disposed when the planet group unmounts)
  const assets = useMemo(() => {
    const rng = new Rng(mixSeed(th.seed, 0xc0ffee));
    return {
      crystalA: crystalCluster(rng, 3),
      crystalB: crystalCluster(rng, 4),
      bloomGeo: bloom(),
      tuftGeo: tuft(),
      capGeo: mushroomCap(),
      rockGeo: new THREE.DodecahedronGeometry(0.3, 0),
      pebbleGeo: new THREE.IcosahedronGeometry(0.16, 0),
      pineLow: new THREE.ConeGeometry(0.42, 1.1, 6),
      pineTop: new THREE.ConeGeometry(0.3, 0.85, 6),
      spireGeo: new THREE.ConeGeometry(0.18, 1.7, 5),
      stemGeo: new THREE.CylinderGeometry(0.07, 0.1, 0.4, 6),
      reedGeo: new THREE.ConeGeometry(0.05, 0.9, 4),
      // forest tree: trunk + two foliage blobs
      trunkGeo: new THREE.CylinderGeometry(0.12, 0.17, 1.0, 6),
      foliageGeo: new THREE.IcosahedronGeometry(0.62, 0),
      foliageTopGeo: new THREE.IcosahedronGeometry(0.42, 0),
      // palm: tall trunk + frond crown
      palmTrunk: new THREE.CylinderGeometry(0.1, 0.14, 1.4, 6),
      palmCrownGeo: palmCrown(),
      // house: body + pyramid roof
      houseBody: new THREE.BoxGeometry(0.8, 0.7, 0.8),
      houseRoof: new THREE.ConeGeometry(0.66, 0.5, 4),
      // street lamp: post + glowing orb
      lampPost: new THREE.CylinderGeometry(0.05, 0.06, 0.9, 6),
      lampOrb: new THREE.IcosahedronGeometry(0.15, 0),
      // machine props
      gearGeo: gear(),
      panelBase: new THREE.BoxGeometry(0.4, 0.3, 0.4),
      panelFace: new THREE.BoxGeometry(0.78, 0.78, 0.07),
      craterGeo: crater(),
      // signature props
      robotGeo: robot(),
      robotEye: new THREE.BoxGeometry(0.16, 0.07, 0.04),
      antMast: new THREE.CylinderGeometry(0.04, 0.06, 1.6, 6),
      antDish: new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      cairnGeo: cairn(),
      shellGeo: new THREE.ConeGeometry(0.16, 0.32, 7),
      buoyGeo: new THREE.ConeGeometry(0.18, 0.4, 8),
      buoyLight: new THREE.IcosahedronGeometry(0.1, 0),
      stallBase: new THREE.BoxGeometry(0.6, 0.1, 0.5),
      stallAwning: new THREE.BoxGeometry(0.7, 0.08, 0.6),
      stallPost: new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5),
    };
  }, [th.seed]);

  // distinct scatter set per layer so they don't all share the same spots.
  // Collidable kinds are thinned (COLLIDE_COUNT_SCALE) to keep lanes open.
  const ptsFor = (kind: DecoKind, density: number, landOnly = true) => {
    const scale = COLLIDE_RADIUS[kind] ? COLLIDE_COUNT_SCALE : 1;
    return planet.scatter(
      Math.max(4, Math.round((coverCount[kind] ?? base) * density * scale)),
      mixSeed(th.seed, kind.charCodeAt(0) * 131 + kind.length * 17),
      landOnly,
    );
  };

  const nodes: ReactNode[] = [];
  const colliders: Collider[] = [];

  for (const layer of th.layers) {
    // buoys float on the water; everything else sticks to land
    const pts = ptsFor(layer.kind, layer.density, layer.kind !== "buoys");
    const cr = COLLIDE_RADIUS[layer.kind];
    if (cr) for (const p of pts) colliders.push({ pos: p.pos, radius: cr });
    switch (layer.kind) {
      case "tufts":
        nodes.push(
          <InstancedProp
            key="tufts"
            points={pts}
            seed={101}
            scaleMin={0.6}
            scaleMax={1.25}
            baseLift={0.0}
            sink={0.04}
            lean={0.25}
            cast={false}
            geometry={assets.tuftGeo}
            material={
              new THREE.MeshStandardMaterial({
                color: th.tuftColor,
                roughness: 1,
                flatShading: true,
              })
            }
          />,
        );
        break;
      case "flowers": {
        // split the points across the bloom palette for a multicolour carpet
        const cols = th.flowerColors;
        nodes.push(
          <InstancedProp
            key="flower-stems"
            points={pts}
            seed={202}
            scaleMin={0.5}
            scaleMax={0.95}
            baseLift={0.0}
            sink={0.02}
            cast={false}
            geometry={assets.stemGeo}
            material={
              new THREE.MeshStandardMaterial({ color: th.tuftColor, roughness: 1 })
            }
          />,
        );
        cols.forEach((c, ci) => {
          const sub = pts.filter((_, i) => i % cols.length === ci);
          nodes.push(
            <InstancedProp
              key={`flower-${ci}`}
              points={sub}
              seed={210 + ci}
              scaleMin={0.7}
              scaleMax={1.3}
              baseLift={0.4}
              cast={false}
              geometry={assets.bloomGeo}
              material={
                new THREE.MeshStandardMaterial({
                  color: c,
                  emissive: c,
                  emissiveIntensity: 0.25,
                  roughness: 0.6,
                  flatShading: true,
                })
              }
            />,
          );
        });
        break;
      }
      case "rocks":
        nodes.push(
          <InstancedProp
            key="rocks"
            points={pts}
            seed={303}
            scaleMin={0.6}
            scaleMax={1.6}
            baseLift={0.18}
            sink={0.22}
            lean={0.5}
            geometry={assets.rockGeo}
            material={
              new THREE.MeshStandardMaterial({
                color: th.rockColor,
                roughness: 1,
                flatShading: true,
              })
            }
          />,
        );
        break;
      case "pebbles":
        nodes.push(
          <InstancedProp
            key="pebbles"
            points={pts}
            seed={313}
            scaleMin={0.5}
            scaleMax={1.1}
            baseLift={0.06}
            sink={0.1}
            lean={0.6}
            cast={false}
            geometry={assets.pebbleGeo}
            material={
              new THREE.MeshStandardMaterial({
                color: th.rockColor,
                roughness: 1,
                flatShading: true,
              })
            }
          />,
        );
        break;
      case "pines":
        nodes.push(
          <InstancedProp
            key="pine-low"
            points={pts}
            seed={404}
            scaleMin={0.7}
            scaleMax={1.4}
            baseLift={0.55}
            sink={0.1}
            geometry={assets.pineLow}
            material={
              new THREE.MeshStandardMaterial({
                color: th.terrainHigh,
                roughness: 0.95,
                flatShading: true,
              })
            }
          />,
          <InstancedProp
            key="pine-top"
            points={pts}
            seed={404}
            scaleMin={0.7}
            scaleMax={1.4}
            baseLift={1.0}
            sink={0.1}
            geometry={assets.pineTop}
            material={
              new THREE.MeshStandardMaterial({
                color: th.terrainPeak,
                roughness: 0.95,
                flatShading: true,
              })
            }
          />,
        );
        break;
      case "crystals":
        nodes.push(
          <InstancedProp
            key="crystal-a"
            points={pts.filter((_, i) => i % 2 === 0)}
            seed={505}
            scaleMin={0.55}
            scaleMax={1.3}
            baseLift={0.2}
            sink={0.18}
            geometry={assets.crystalA}
            material={
              new THREE.MeshStandardMaterial({
                color: th.accent,
                emissive: th.accent,
                emissiveIntensity: 0.5,
                roughness: 0.2,
                metalness: 0.1,
                flatShading: true,
              })
            }
          />,
          <InstancedProp
            key="crystal-b"
            points={pts.filter((_, i) => i % 2 === 1)}
            seed={515}
            scaleMin={0.5}
            scaleMax={1.15}
            baseLift={0.2}
            sink={0.18}
            geometry={assets.crystalB}
            material={
              new THREE.MeshStandardMaterial({
                color: th.accent2,
                emissive: th.accent2,
                emissiveIntensity: 0.5,
                roughness: 0.2,
                metalness: 0.1,
                flatShading: true,
              })
            }
          />,
        );
        break;
      case "mushrooms":
        nodes.push(
          <InstancedProp
            key="mush-stem"
            points={pts}
            seed={606}
            scaleMin={0.7}
            scaleMax={1.5}
            baseLift={0.25}
            sink={0.05}
            geometry={assets.stemGeo}
            material={
              new THREE.MeshStandardMaterial({ color: "#fff4f0", roughness: 0.9 })
            }
          />,
          <InstancedProp
            key="mush-cap"
            points={pts}
            seed={606}
            scaleMin={0.7}
            scaleMax={1.5}
            baseLift={0.5}
            sink={0.05}
            geometry={assets.capGeo}
            material={
              new THREE.MeshStandardMaterial({
                color: th.accent2,
                emissive: th.accent2,
                emissiveIntensity: 0.3,
                roughness: 0.7,
                flatShading: true,
              })
            }
          />,
        );
        break;
      case "blossoms":
        nodes.push(
          <InstancedProp
            key="blossom-bush"
            points={pts}
            seed={707}
            scaleMin={0.7}
            scaleMax={1.5}
            baseLift={0.45}
            sink={0.1}
            lean={0.15}
            geometry={assets.crystalA /* reuse a chunky cluster as a bush base */}
            material={
              new THREE.MeshStandardMaterial({
                color: th.terrainHigh,
                roughness: 0.95,
                flatShading: true,
              })
            }
          />,
          <InstancedProp
            key="blossom-petals"
            points={pts}
            seed={717}
            scaleMin={1.0}
            scaleMax={1.8}
            baseLift={0.7}
            geometry={assets.bloomGeo}
            material={
              new THREE.MeshStandardMaterial({
                color: th.accent,
                emissive: th.accent,
                emissiveIntensity: 0.3,
                roughness: 0.7,
                flatShading: true,
              })
            }
          />,
        );
        break;
      case "spires":
        nodes.push(
          <InstancedProp
            key="spires"
            points={pts}
            seed={808}
            scaleMin={0.7}
            scaleMax={1.7}
            baseLift={0.85}
            sink={0.1}
            lean={0.12}
            geometry={assets.spireGeo}
            material={
              new THREE.MeshStandardMaterial({
                color: th.terrainPeak,
                emissive: th.accent2,
                emissiveIntensity: 0.18,
                roughness: 0.6,
                flatShading: true,
              })
            }
          />,
        );
        break;
      case "reeds":
        nodes.push(
          <InstancedProp
            key="reeds"
            points={pts}
            seed={909}
            scaleMin={0.7}
            scaleMax={1.4}
            baseLift={0.45}
            sink={0.05}
            lean={0.3}
            cast={false}
            geometry={assets.reedGeo}
            material={
              new THREE.MeshStandardMaterial({
                color: th.terrainHigh,
                roughness: 1,
                flatShading: true,
              })
            }
          />,
        );
        break;
      case "trees":
        nodes.push(
          <InstancedProp
            key="tree-trunk"
            points={pts}
            seed={1010}
            scaleMin={0.8}
            scaleMax={1.6}
            baseLift={0.5}
            sink={0.1}
            geometry={assets.trunkGeo}
            material={new THREE.MeshStandardMaterial({ color: "#9a6f49", roughness: 1, flatShading: true })}
          />,
          <InstancedProp
            key="tree-foliage"
            points={pts}
            seed={1010}
            scaleMin={0.8}
            scaleMax={1.6}
            baseLift={1.15}
            lean={0.08}
            geometry={assets.foliageGeo}
            material={new THREE.MeshStandardMaterial({ color: th.terrainHigh, roughness: 0.95, flatShading: true })}
          />,
          <InstancedProp
            key="tree-foliage-top"
            points={pts}
            seed={1011}
            scaleMin={0.8}
            scaleMax={1.6}
            baseLift={1.6}
            geometry={assets.foliageTopGeo}
            material={new THREE.MeshStandardMaterial({ color: th.terrainPeak, roughness: 0.95, flatShading: true })}
          />,
        );
        break;
      case "palms":
        nodes.push(
          <InstancedProp
            key="palm-trunk"
            points={pts}
            seed={1212}
            scaleMin={0.8}
            scaleMax={1.5}
            baseLift={0.7}
            sink={0.1}
            lean={0.2}
            geometry={assets.palmTrunk}
            material={new THREE.MeshStandardMaterial({ color: "#b98a5e", roughness: 1, flatShading: true })}
          />,
          <InstancedProp
            key="palm-crown"
            points={pts}
            seed={1212}
            scaleMin={0.8}
            scaleMax={1.5}
            baseLift={1.4}
            lean={0.2}
            geometry={assets.palmCrownGeo}
            material={new THREE.MeshStandardMaterial({ color: th.terrainHigh, roughness: 0.9, flatShading: true })}
          />,
        );
        break;
      case "houses":
        nodes.push(
          <InstancedProp
            key="house-body"
            points={pts}
            seed={1313}
            scaleMin={0.8}
            scaleMax={1.6}
            baseLift={0.35}
            sink={0.08}
            geometry={assets.houseBody}
            material={new THREE.MeshStandardMaterial({ color: th.structureColor, roughness: 0.85, flatShading: true })}
          />,
          <InstancedProp
            key="house-roof"
            points={pts}
            seed={1313}
            scaleMin={0.8}
            scaleMax={1.6}
            baseLift={0.95}
            geometry={assets.houseRoof}
            material={new THREE.MeshStandardMaterial({ color: th.accent, roughness: 0.8, flatShading: true })}
          />,
        );
        break;
      case "lamps":
        nodes.push(
          <InstancedProp
            key="lamp-post"
            points={pts}
            seed={1414}
            scaleMin={0.8}
            scaleMax={1.4}
            baseLift={0.45}
            sink={0.05}
            geometry={assets.lampPost}
            material={new THREE.MeshStandardMaterial({ color: th.structureColor, roughness: 0.7, metalness: 0.3, flatShading: true })}
          />,
          <InstancedProp
            key="lamp-orb"
            points={pts}
            seed={1414}
            scaleMin={0.8}
            scaleMax={1.4}
            baseLift={0.95}
            cast={false}
            geometry={assets.lampOrb}
            material={new THREE.MeshStandardMaterial({ color: th.accent, emissive: th.accent, emissiveIntensity: 1.3, roughness: 0.4 })}
          />,
        );
        break;
      case "gears":
        nodes.push(
          <InstancedProp
            key="gears"
            points={pts}
            seed={1515}
            scaleMin={0.7}
            scaleMax={1.8}
            baseLift={0.5}
            sink={0.15}
            lean={0.5}
            geometry={assets.gearGeo}
            material={new THREE.MeshStandardMaterial({ color: th.structureColor, emissive: th.accent, emissiveIntensity: 0.15, roughness: 0.5, metalness: 0.6, flatShading: true })}
          />,
        );
        break;
      case "panels":
        nodes.push(
          <InstancedProp
            key="panel-base"
            points={pts}
            seed={1616}
            scaleMin={0.8}
            scaleMax={1.7}
            baseLift={0.2}
            sink={0.05}
            geometry={assets.panelBase}
            material={new THREE.MeshStandardMaterial({ color: th.structureColor, roughness: 0.6, metalness: 0.5, flatShading: true })}
          />,
          <InstancedProp
            key="panel-face"
            points={pts}
            seed={1616}
            scaleMin={0.8}
            scaleMax={1.7}
            baseLift={0.7}
            lean={0.12}
            geometry={assets.panelFace}
            material={new THREE.MeshStandardMaterial({ color: th.accent, emissive: th.accent, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.2 })}
          />,
        );
        break;
      case "craters":
        nodes.push(
          <InstancedProp
            key="craters"
            points={pts}
            seed={1717}
            scaleMin={0.8}
            scaleMax={2.4}
            baseLift={0.0}
            sink={0.12}
            cast={false}
            geometry={assets.craterGeo}
            material={new THREE.MeshStandardMaterial({ color: th.rockColor, roughness: 1, flatShading: true })}
          />,
        );
        break;
      case "robots":
        nodes.push(
          <InstancedProp
            key="robot-body"
            points={pts}
            seed={1818}
            scaleMin={0.7}
            scaleMax={1.3}
            baseLift={0.0}
            sink={0.05}
            geometry={assets.robotGeo}
            material={new THREE.MeshStandardMaterial({ color: th.structureColor, roughness: 0.5, metalness: 0.6, flatShading: true })}
          />,
          <InstancedProp
            key="robot-eye"
            points={pts}
            seed={1818}
            scaleMin={0.7}
            scaleMax={1.3}
            baseLift={0.62}
            cast={false}
            geometry={assets.robotEye}
            material={new THREE.MeshStandardMaterial({ color: th.accent, emissive: th.accent, emissiveIntensity: 1.4, roughness: 0.4 })}
          />,
        );
        break;
      case "antennas":
        nodes.push(
          <InstancedProp
            key="ant-mast"
            points={pts}
            seed={1919}
            scaleMin={0.8}
            scaleMax={1.8}
            baseLift={0.8}
            sink={0.05}
            geometry={assets.antMast}
            material={new THREE.MeshStandardMaterial({ color: th.structureColor, roughness: 0.5, metalness: 0.6, flatShading: true })}
          />,
          <InstancedProp
            key="ant-dish"
            points={pts}
            seed={1919}
            scaleMin={0.8}
            scaleMax={1.8}
            baseLift={1.55}
            geometry={assets.antDish}
            material={new THREE.MeshStandardMaterial({ color: th.structureColor, roughness: 0.6, metalness: 0.4, flatShading: true })}
          />,
          <InstancedProp
            key="ant-light"
            points={pts}
            seed={1919}
            scaleMin={0.8}
            scaleMax={1.8}
            baseLift={1.62}
            cast={false}
            geometry={assets.buoyLight}
            material={new THREE.MeshStandardMaterial({ color: th.accent, emissive: th.accent, emissiveIntensity: 1.6, roughness: 0.4 })}
          />,
        );
        break;
      case "cairns":
        nodes.push(
          <InstancedProp
            key="cairns"
            points={pts}
            seed={2020}
            scaleMin={0.8}
            scaleMax={1.7}
            baseLift={0.0}
            sink={0.08}
            geometry={assets.cairnGeo}
            material={new THREE.MeshStandardMaterial({ color: th.rockColor, roughness: 1, flatShading: true })}
          />,
        );
        break;
      case "shells":
        nodes.push(
          <InstancedProp
            key="shells"
            points={pts}
            seed={2121}
            scaleMin={0.6}
            scaleMax={1.3}
            baseLift={0.12}
            sink={0.06}
            lean={0.7}
            cast={false}
            geometry={assets.shellGeo}
            material={new THREE.MeshStandardMaterial({ color: th.accent, roughness: 0.5, flatShading: true })}
          />,
        );
        break;
      case "buoys":
        nodes.push(
          <InstancedProp
            key="buoy-body"
            points={pts}
            seed={2222}
            scaleMin={0.8}
            scaleMax={1.4}
            baseLift={0.18}
            sink={0.0}
            geometry={assets.buoyGeo}
            material={new THREE.MeshStandardMaterial({ color: th.accent, roughness: 0.6, flatShading: true })}
          />,
          <InstancedProp
            key="buoy-light"
            points={pts}
            seed={2222}
            scaleMin={0.8}
            scaleMax={1.4}
            baseLift={0.48}
            cast={false}
            geometry={assets.buoyLight}
            material={new THREE.MeshStandardMaterial({ color: th.accent2, emissive: th.accent2, emissiveIntensity: 1.3, roughness: 0.4 })}
          />,
        );
        break;
      case "glowmush":
        nodes.push(
          <InstancedProp
            key="glow-stem"
            points={pts}
            seed={2323}
            scaleMin={0.7}
            scaleMax={1.4}
            baseLift={0.25}
            sink={0.05}
            geometry={assets.stemGeo}
            material={new THREE.MeshStandardMaterial({ color: "#f3ecff", roughness: 0.8 })}
          />,
          <InstancedProp
            key="glow-cap"
            points={pts}
            seed={2323}
            scaleMin={0.7}
            scaleMax={1.4}
            baseLift={0.5}
            cast={false}
            geometry={assets.capGeo}
            material={new THREE.MeshStandardMaterial({ color: th.accent, emissive: th.accent, emissiveIntensity: 1.2, roughness: 0.5, flatShading: true })}
          />,
        );
        break;
      case "stalls":
        nodes.push(
          <InstancedProp
            key="stall-base"
            points={pts}
            seed={2424}
            scaleMin={0.8}
            scaleMax={1.4}
            baseLift={0.1}
            sink={0.04}
            geometry={assets.stallBase}
            material={new THREE.MeshStandardMaterial({ color: "#b98a5e", roughness: 0.9, flatShading: true })}
          />,
          <InstancedProp
            key="stall-post"
            points={pts}
            seed={2424}
            scaleMin={0.8}
            scaleMax={1.4}
            baseLift={0.45}
            cast={false}
            geometry={assets.stallPost}
            material={new THREE.MeshStandardMaterial({ color: "#9a6f49", roughness: 0.9, flatShading: true })}
          />,
          <InstancedProp
            key="stall-awning"
            points={pts}
            seed={2424}
            scaleMin={0.8}
            scaleMax={1.4}
            baseLift={0.72}
            lean={0.06}
            geometry={assets.stallAwning}
            material={new THREE.MeshStandardMaterial({ color: th.accent, roughness: 0.7, flatShading: true })}
          />,
        );
        break;
    }
  }

  // register this world's big-prop colliders (runs once per planet on mount)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => addColliders(planet.index, colliders), [planet.index, quality]);

  return <group>{nodes}</group>;
}
