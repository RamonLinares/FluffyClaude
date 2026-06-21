import { ReactNode, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Planet, ScatterPoint } from "../game/planet";
import { DecoKind } from "../game/theme";
import { Rng, mixSeed } from "../game/rng";

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
  const base = Math.round((hi ? 190 : 120) * th.decoDensity);
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
    };
  }, [th.seed]);

  // distinct scatter set per layer so they don't all share the same spots
  const ptsFor = (kind: DecoKind, density: number) =>
    planet.scatter(
      Math.max(4, Math.round((coverCount[kind] ?? base) * density)),
      mixSeed(th.seed, kind.charCodeAt(0) * 131 + kind.length * 17),
      true,
    );

  const nodes: ReactNode[] = [];

  for (const layer of th.layers) {
    const pts = ptsFor(layer.kind, layer.density);
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
    }
  }

  return <group>{nodes}</group>;
}
