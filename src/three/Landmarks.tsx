import { useMemo } from "react";
import * as THREE from "three";
import { Planet } from "../game/planet";
import { Rng, mixSeed } from "../game/rng";

const UP = new THREE.Vector3(0, 1, 0);

const STONE = "#e7e0d6";
const STONE_DARK = "#c9c0b2";
const MOSS = "#9fc27a";

function useSurfaceQuat(dir: THREE.Vector3, yaw: number) {
  return useMemo(() => {
    const qDir = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    const qYaw = new THREE.Quaternion().setFromAxisAngle(dir, yaw);
    return qYaw.multiply(qDir);
  }, [dir, yaw]);
}

/** A weathered stone arch with mossy trim. */
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
      {/* two legs */}
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} position={[x, 1.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 2.4, 0.5]} />
          <meshStandardMaterial color={STONE} roughness={0.95} flatShading />
        </mesh>
      ))}
      {/* curved top made of voussoir blocks */}
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
      {/* mossy keystone glow */}
      <mesh position={[0, 3.25, 0]} castShadow>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} flatShading />
      </mesh>
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

/** A ring of broken columns around a glyph dais. */
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
      {/* stepped platform */}
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.9, 2.05, 0.18, 24]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 0.22, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.5, 1.6, 0.16, 24]} />
        <meshStandardMaterial color={STONE} roughness={0.95} flatShading />
      </mesh>
      {/* glowing rune disc */}
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
      {/* broken columns of varied heights */}
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

export function Landmarks({ planet }: { planet: Planet }) {
  const th = planet.theme;
  const spots = useMemo(
    () => planet.scatter(4, mixSeed(th.seed, 0x1a2d), true),
    [planet, th.seed],
  );
  if (!th.hasRuins || spots.length < 2) return null;

  const yawFor = (i: number) => {
    const r = new Rng(mixSeed(th.seed, i * 977));
    return r.range(0, Math.PI * 2);
  };

  const archDir = spots[0].dir;
  const archBase = planet.standRadius(archDir);
  const daisDir = spots[1].dir;
  const daisBase = planet.standRadius(daisDir);

  return (
    <group>
      <Arch dir={archDir} base={archBase} yaw={yawFor(0)} accent={th.accent} />
      <Dais dir={daisDir} base={daisBase} yaw={yawFor(1)} accent={th.accent2} />
    </group>
  );
}
