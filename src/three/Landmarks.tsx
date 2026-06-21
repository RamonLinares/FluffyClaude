import { useMemo } from "react";
import * as THREE from "three";
import { Planet } from "../game/planet";
import { Rng, mixSeed } from "../game/rng";
import { Portal } from "./Portal";

const UP = new THREE.Vector3(0, 1, 0);

const STONE = "#e7e0d6";
const STONE_DARK = "#c9c0b2";
const MOSS = "#9fc27a";
const WOOD = "#b98a5e";
const WOOD_DARK = "#9a6f49";

function useSurfaceQuat(dir: THREE.Vector3, yaw: number) {
  return useMemo(() => {
    const qDir = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    const qYaw = new THREE.Quaternion().setFromAxisAngle(dir, yaw);
    return qYaw.multiply(qDir);
  }, [dir, yaw]);
}

/** A draped vine: a thin stem with a few leaves, hanging downward from y0. */
function Vine({ x, y0, len, leaf }: { x: number; y0: number; len: number; leaf: string }) {
  const segs = Math.max(2, Math.round(len / 0.5));
  return (
    <group position={[x, y0, 0.28]}>
      <mesh position={[0, -len / 2, 0]}>
        <cylinderGeometry args={[0.04, 0.03, len, 5]} />
        <meshStandardMaterial color={MOSS} roughness={1} flatShading />
      </mesh>
      {Array.from({ length: segs }).map((_, i) => {
        const yy = -((i + 0.5) / segs) * len;
        const side = i % 2 ? 1 : -1;
        return (
          <mesh
            key={i}
            position={[side * 0.1, yy, 0]}
            scale={[0.16, 0.1, 0.05]}
            rotation={[0, 0, side * 0.5]}
          >
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={leaf} roughness={0.9} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

/** A weathered stone arch with mossy trim and hanging vines. */
function Arch({
  dir,
  base,
  yaw,
  accent,
}: {
  dir: THREE.Vector3;
  base: number;
  yaw: number;
  accent: string;
}) {
  const quat = useSurfaceQuat(dir, yaw);
  const pos = useMemo(() => dir.clone().multiplyScalar(base - 0.3), [dir, base]);
  return (
    <group position={pos} quaternion={quat}>
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} position={[x, 1.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 2.4, 0.5]} />
          <meshStandardMaterial color={STONE} roughness={0.95} flatShading />
        </mesh>
      ))}
      {Array.from({ length: 7 }).map((_, i) => {
        const a = Math.PI * (0.12 + (i / 6) * 0.76);
        const r = 1.45;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, 2.0 + Math.sin(a) * r * 0.62, 0]}
            rotation={[0, 0, a - Math.PI / 2]}
            castShadow
          >
            <boxGeometry args={[0.46, 0.5, 0.5]} />
            <meshStandardMaterial color={i % 2 ? STONE_DARK : STONE} roughness={0.95} flatShading />
          </mesh>
        );
      })}
      <mesh position={[0, 3.25, 0]} castShadow>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} flatShading />
      </mesh>
      {/* hanging vines off the arch crown */}
      <Vine x={-0.6} y0={2.9} len={1.5} leaf={MOSS} />
      <Vine x={0.0} y0={3.15} len={2.1} leaf={"#86b76a"} />
      <Vine x={0.65} y0={2.8} len={1.2} leaf={MOSS} />
      {/* moss at the feet */}
      {[-0.95, 0.95].map((x) => (
        <mesh key={`m${x}`} position={[x, 0.12, 0.18]} scale={[0.5, 0.18, 0.4]}>
          <icosahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color={MOSS} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** A ring of broken columns around a glowing glyph dais. */
function Dais({
  dir,
  base,
  yaw,
  accent,
}: {
  dir: THREE.Vector3;
  base: number;
  yaw: number;
  accent: string;
}) {
  const quat = useSurfaceQuat(dir, yaw);
  const pos = useMemo(() => dir.clone().multiplyScalar(base - 0.25), [dir, base]);
  return (
    <group position={pos} quaternion={quat}>
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.9, 2.05, 0.18, 24]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 0.22, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.5, 1.6, 0.16, 24]} />
        <meshStandardMaterial color={STONE} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 1.1, 28]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.9}
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
        />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        const r = 1.7;
        const h = [1.6, 0.7, 1.2, 0.5, 1.4, 0.9][i];
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, h / 2, Math.sin(a) * r]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.22, 0.26, h, 10]} />
            <meshStandardMaterial color={i % 2 ? STONE : STONE_DARK} roughness={0.95} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

/** A little wooden signpost with a glowing star, like the reference. */
function Signpost({
  dir,
  base,
  yaw,
  accent,
}: {
  dir: THREE.Vector3;
  base: number;
  yaw: number;
  accent: string;
}) {
  const quat = useSurfaceQuat(dir, yaw);
  const pos = useMemo(() => dir.clone().multiplyScalar(base - 0.1), [dir, base]);
  return (
    <group position={pos} quaternion={quat}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.09, 1.1, 7]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={1} flatShading />
      </mesh>
      <group position={[0, 0.95, 0]} rotation={[0, 0, -0.06]}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 0.5, 0.08]} />
          <meshStandardMaterial color={WOOD} roughness={1} flatShading />
        </mesh>
        <mesh position={[0, 0, 0.06]} scale={[0.22, 0.22, 0.06]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} flatShading />
        </mesh>
      </group>
      <mesh position={[0, 0.06, 0.12]} scale={[0.34, 0.12, 0.28]}>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={MOSS} roughness={1} flatShading />
      </mesh>
    </group>
  );
}

export function Landmarks({ planet }: { planet: Planet }) {
  const th = planet.theme;
  const spots = useMemo(
    () => planet.scatter(6, mixSeed(th.seed, 0x1a2d), true),
    [planet, th.seed],
  );
  if (!th.hasRuins || spots.length < 4) return null;

  const yawFor = (i: number) =>
    new Rng(mixSeed(th.seed, i * 977 + 13)).range(0, Math.PI * 2);

  const place = (i: number) => ({
    dir: spots[i].dir,
    base: planet.standRadius(spots[i].dir),
    yaw: yawFor(i),
  });

  const a = place(0);
  const d = place(1);
  const p = place(2);
  const s = place(3);

  return (
    <group>
      <Arch dir={a.dir} base={a.base} yaw={a.yaw} accent={th.accent} />
      <Dais dir={d.dir} base={d.base} yaw={d.yaw} accent={th.accent2} />
      <Portal dir={p.dir} base={p.base} yaw={p.yaw} accent={th.accent} accent2={th.accent2} />
      <Signpost dir={s.dir} base={s.base} yaw={s.yaw} accent={th.accent2} />
    </group>
  );
}
