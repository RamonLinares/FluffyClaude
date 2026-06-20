import { ReactNode, useMemo } from "react";
import * as THREE from "three";
import { Planet, ScatterPoint } from "../game/planet";
import { Rng, mixSeed } from "../game/rng";

const UP = new THREE.Vector3(0, 1, 0);

function InstancedProp({
  points,
  seed,
  scaleMin,
  scaleMax,
  baseLift,
  sink = 0,
  children,
}: {
  points: ScatterPoint[];
  seed: number;
  scaleMin: number;
  scaleMax: number;
  baseLift: number; // local distance from center to base (along +Y) at scale 1
  sink?: number;
  children: ReactNode;
}) {
  const matrices = useMemo(() => {
    const rng = new Rng(seed);
    const qDir = new THREE.Quaternion();
    const qYaw = new THREE.Quaternion();
    const q = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const pos = new THREE.Vector3();
    const out: THREE.Matrix4[] = [];
    for (const p of points) {
      const sc = rng.range(scaleMin, scaleMax);
      qDir.setFromUnitVectors(UP, p.dir);
      qYaw.setFromAxisAngle(p.dir, rng.range(0, Math.PI * 2));
      q.multiplyQuaternions(qYaw, qDir);
      pos.copy(p.dir).multiplyScalar(p.pos.length() + baseLift * sc - sink);
      scale.set(sc, sc, sc);
      out.push(new THREE.Matrix4().compose(pos, q, scale));
    }
    return out;
  }, [points, seed, scaleMin, scaleMax, baseLift, sink]);

  const ref = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    for (let i = 0; i < matrices.length; i++) mesh.setMatrixAt(i, matrices[i]);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  };

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, matrices.length]}>
      {children}
    </instancedMesh>
  );
}

export function Decorations({
  planet,
  quality,
}: {
  planet: Planet;
  quality: "low" | "high";
}) {
  const kind = planet.theme.decoration;
  const baseCount = Math.round(
    (quality === "high" ? 130 : 70) * planet.theme.decoDensity,
  );
  const points = useMemo(
    () => planet.scatter(baseCount, mixSeed(planet.theme.seed, 0x7a3d), true),
    [planet, baseCount],
  );

  const th = planet.theme;

  if (kind === "pines") {
    return (
      <group>
        <InstancedProp points={points} seed={11} scaleMin={0.7} scaleMax={1.3} baseLift={0.55} sink={0.1}>
          <coneGeometry args={[0.42, 1.1, 6]} />
          <meshStandardMaterial color={th.terrainHigh} roughness={0.95} flatShading />
        </InstancedProp>
        <InstancedProp points={points} seed={11} scaleMin={0.7} scaleMax={1.3} baseLift={0.95} sink={0.1}>
          <coneGeometry args={[0.3, 0.8, 6]} />
          <meshStandardMaterial color={th.terrainPeak} roughness={0.95} flatShading />
        </InstancedProp>
      </group>
    );
  }
  if (kind === "crystals") {
    return (
      <InstancedProp points={points} seed={13} scaleMin={0.5} scaleMax={1.2} baseLift={0.7} sink={0.15}>
        <octahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color={th.accent} emissive={th.accent} emissiveIntensity={0.35} roughness={0.25} metalness={0.1} flatShading />
      </InstancedProp>
    );
  }
  if (kind === "mushrooms") {
    return (
      <group>
        <InstancedProp points={points} seed={17} scaleMin={0.7} scaleMax={1.2} baseLift={0.25} sink={0.05}>
          <cylinderGeometry args={[0.1, 0.13, 0.5, 8]} />
          <meshStandardMaterial color="#fff4f0" roughness={0.9} />
        </InstancedProp>
        <InstancedProp points={points} seed={17} scaleMin={0.7} scaleMax={1.2} baseLift={0.55} sink={0.05}>
          <sphereGeometry args={[0.28, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={th.accent2} roughness={0.7} flatShading />
        </InstancedProp>
      </group>
    );
  }
  if (kind === "blossoms") {
    return (
      <group>
        <InstancedProp points={points} seed={19} scaleMin={0.6} scaleMax={1.1} baseLift={0.3} sink={0.05}>
          <icosahedronGeometry args={[0.34, 0]} />
          <meshStandardMaterial color={th.terrainHigh} roughness={0.95} flatShading />
        </InstancedProp>
        <InstancedProp points={points} seed={23} scaleMin={0.5} scaleMax={0.9} baseLift={0.5} sink={0.05}>
          <icosahedronGeometry args={[0.18, 0]} />
          <meshStandardMaterial color={th.accent} emissive={th.accent} emissiveIntensity={0.25} roughness={0.7} flatShading />
        </InstancedProp>
      </group>
    );
  }
  // spires
  return (
    <InstancedProp points={points} seed={29} scaleMin={0.7} scaleMax={1.6} baseLift={0.9} sink={0.1}>
      <coneGeometry args={[0.2, 1.8, 5]} />
      <meshStandardMaterial color={th.terrainPeak} emissive={th.accent2} emissiveIntensity={0.15} roughness={0.6} flatShading />
    </InstancedProp>
  );
}
