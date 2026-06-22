import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Planet } from "../game/planet";
import { PlanetTheme } from "../game/theme";
import { Rng, mixSeed } from "../game/rng";
import { addColliders, Collider } from "../game/colliders";
import { Portal } from "./Portal";

const UP = new THREE.Vector3(0, 1, 0);

const STONE = "#e7e0d6";
const STONE_DARK = "#c9c0b2";
const MOSS = "#9fc27a";
const WOOD = "#b98a5e";
const WOOD_DARK = "#9a6f49";

function makeSurfaceQuat(dir: THREE.Vector3, yaw: number) {
  const qDir = new THREE.Quaternion().setFromUnitVectors(UP, dir);
  const qYaw = new THREE.Quaternion().setFromAxisAngle(dir, yaw);
  return qYaw.multiply(qDir);
}
function useSurfaceQuat(dir: THREE.Vector3, yaw: number) {
  return useMemo(() => makeSurfaceQuat(dir, yaw), [dir, yaw]);
}

// Yaw must match what Landmarks() uses to place each hero, so colliders line up.
function heroYaw(seed: number, i: number) {
  return new Rng(mixSeed(seed, i * 977 + 13)).range(0, Math.PI * 2);
}

interface HeroProps {
  dir: THREE.Vector3;
  base: number;
  yaw: number;
  th: PlanetTheme;
}

function useHeroPos(dir: THREE.Vector3, base: number, drop = 0.3) {
  return useMemo(() => dir.clone().multiplyScalar(base - drop), [dir, base, drop]);
}

// ---- draped vine helper -----------------------------------------------------
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
          <mesh key={i} position={[side * 0.1, yy, 0]} scale={[0.16, 0.1, 0.05]} rotation={[0, 0, side * 0.5]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={leaf} roughness={0.9} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

// ---- garden / ancient heroes ------------------------------------------------
function Arch({ dir, base, yaw, th }: HeroProps) {
  const quat = useSurfaceQuat(dir, yaw);
  const pos = useHeroPos(dir, base);
  const accent = th.accent;
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
          <mesh key={i} position={[Math.cos(a) * r, 2.0 + Math.sin(a) * r * 0.62, 0]} rotation={[0, 0, a - Math.PI / 2]} castShadow>
            <boxGeometry args={[0.46, 0.5, 0.5]} />
            <meshStandardMaterial color={i % 2 ? STONE_DARK : STONE} roughness={0.95} flatShading />
          </mesh>
        );
      })}
      <mesh position={[0, 3.25, 0]} castShadow>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} flatShading />
      </mesh>
      <Vine x={-0.6} y0={2.9} len={1.5} leaf={MOSS} />
      <Vine x={0.0} y0={3.15} len={2.1} leaf={"#86b76a"} />
      <Vine x={0.65} y0={2.8} len={1.2} leaf={MOSS} />
    </group>
  );
}

function Dais({ dir, base, yaw, th }: HeroProps) {
  const quat = useSurfaceQuat(dir, yaw);
  const pos = useHeroPos(dir, base, 0.25);
  const accent = th.accent2;
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
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} side={THREE.DoubleSide} transparent opacity={0.9} />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        const r = 1.7;
        const h = [1.6, 0.7, 1.2, 0.5, 1.4, 0.9][i];
        return (
          <mesh key={i} position={[Math.cos(a) * r, h / 2, Math.sin(a) * r]} castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.26, h, 10]} />
            <meshStandardMaterial color={i % 2 ? STONE : STONE_DARK} roughness={0.95} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

function Signpost({ dir, base, yaw, th }: HeroProps) {
  const quat = useSurfaceQuat(dir, yaw);
  const pos = useHeroPos(dir, base, 0.1);
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
          <meshStandardMaterial color={th.accent2} emissive={th.accent2} emissiveIntensity={0.7} flatShading />
        </mesh>
      </group>
    </group>
  );
}

// ---- forest heroes ----------------------------------------------------------
function GiantTree({ dir, base, yaw, th }: HeroProps) {
  const quat = useSurfaceQuat(dir, yaw);
  const pos = useHeroPos(dir, base, 0.2);
  return (
    <group position={pos} quaternion={quat}>
      <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.45, 0.7, 3.2, 8]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={1} flatShading />
      </mesh>
      {[
        [0, 3.6, 0, 1.9],
        [-1.0, 3.1, 0.3, 1.2],
        [1.0, 3.3, -0.2, 1.3],
        [0.1, 4.6, 0, 1.3],
      ].map((b, i) => (
        <mesh key={i} position={[b[0], b[1], b[2]]} scale={b[3]} castShadow>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={i % 2 ? th.terrainHigh : th.terrainPeak} roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function RootArch({ dir, base, yaw, th }: HeroProps) {
  const quat = useSurfaceQuat(dir, yaw);
  const pos = useHeroPos(dir, base);
  return (
    <group position={pos} quaternion={quat}>
      {[-1.0, 1.0].map((x) => (
        <mesh key={x} position={[x, 1.0, 0]} rotation={[0, 0, x * 0.12]} castShadow>
          <cylinderGeometry args={[0.3, 0.42, 2.2, 7]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={1} flatShading />
        </mesh>
      ))}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = Math.PI * (0.16 + (i / 5) * 0.68);
        const r = 1.35;
        return (
          <mesh key={i} position={[Math.cos(a) * r, 1.9 + Math.sin(a) * r * 0.6, 0]} rotation={[0, 0, a - Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.26, 0.26, 0.6, 6]} />
            <meshStandardMaterial color={WOOD} roughness={1} flatShading />
          </mesh>
        );
      })}
      <Vine x={-0.4} y0={2.5} len={1.6} leaf={MOSS} />
      <Vine x={0.4} y0={2.6} len={1.9} leaf={"#86b76a"} />
      <mesh position={[0, 3.0, 0]}>
        <icosahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial color={th.terrainPeak} roughness={0.95} flatShading />
      </mesh>
    </group>
  );
}

// ---- ocean heroes -----------------------------------------------------------
function Lighthouse({ dir, base, yaw, th }: HeroProps) {
  const quat = useSurfaceQuat(dir, yaw);
  const pos = useHeroPos(dir, base, 0.2);
  const beam = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (beam.current) beam.current.rotation.y += dt * 0.8;
  });
  return (
    <group position={pos} quaternion={quat}>
      <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.45, 0.75, 2.8, 12]} />
        <meshStandardMaterial color={STONE} roughness={0.85} flatShading />
      </mesh>
      {[0.9, 1.7, 2.5].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <cylinderGeometry args={[0.62 - i * 0.09, 0.66 - i * 0.09, 0.22, 12]} />
          <meshStandardMaterial color={th.accent} roughness={0.7} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 3.05, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.5, 12]} />
        <meshStandardMaterial color="#fff6e0" emissive="#fff0c8" emissiveIntensity={1.2} roughness={0.4} />
      </mesh>
      <mesh position={[0, 3.45, 0]}>
        <coneGeometry args={[0.6, 0.5, 12]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.8} flatShading />
      </mesh>
      <group ref={beam} position={[0, 3.05, 0]}>
        <mesh position={[1.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.5, 3.2, 12, 1, true]} />
          <meshStandardMaterial color="#fff3cf" emissive="#fff3cf" emissiveIntensity={0.9} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      <pointLight position={[0, 3.05, 0]} color="#fff0c8" intensity={1.6} distance={10} decay={2} />
    </group>
  );
}

function Pier({ dir, base, yaw, th }: HeroProps) {
  const quat = useSurfaceQuat(dir, yaw);
  const pos = useHeroPos(dir, base, 0.1);
  return (
    <group position={pos} quaternion={quat}>
      <mesh position={[0, 0.55, 1.1]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.12, 3.0]} />
        <meshStandardMaterial color={WOOD} roughness={1} flatShading />
      </mesh>
      {[
        [-0.45, 0.2],
        [0.45, 0.2],
        [-0.45, 1.6],
        [0.45, 1.6],
        [-0.45, 2.5],
        [0.45, 2.5],
      ].map((p, i) => (
        <mesh key={i} position={[p[0], 0.28, p[1]]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.6, 6]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={1} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.75, 2.7]} rotation={[0.2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.9, 6]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={1} flatShading />
      </mesh>
      <mesh position={[0.22, 1.05, 2.7]}>
        <planeGeometry args={[0.4, 0.3]} />
        <meshStandardMaterial color={th.accent} side={THREE.DoubleSide} emissive={th.accent} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// ---- civilization heroes ----------------------------------------------------
function Windmill({ dir, base, yaw, th }: HeroProps) {
  const quat = useSurfaceQuat(dir, yaw);
  const pos = useHeroPos(dir, base, 0.2);
  const blades = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.z += dt * 0.6;
  });
  return (
    <group position={pos} quaternion={quat}>
      <mesh position={[0, 1.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.8, 2.6, 10]} />
        <meshStandardMaterial color={th.structureColor} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 2.75, 0]} castShadow>
        <coneGeometry args={[0.7, 0.7, 10]} />
        <meshStandardMaterial color={th.accent} roughness={0.8} flatShading />
      </mesh>
      <group ref={blades} position={[0, 2.5, 0.55]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i / 4) * Math.PI * 2]} position={[0, 0, 0]}>
            <mesh position={[0, 0.7, 0]} castShadow>
              <boxGeometry args={[0.18, 1.4, 0.05]} />
              <meshStandardMaterial color="#fff6ea" roughness={0.8} flatShading />
            </mesh>
          </mesh>
        ))}
        <mesh>
          <cylinderGeometry args={[0.12, 0.12, 0.16, 8]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} flatShading />
        </mesh>
      </group>
    </group>
  );
}

function TownGate({ dir, base, yaw, th }: HeroProps) {
  const quat = useSurfaceQuat(dir, yaw);
  const pos = useHeroPos(dir, base);
  return (
    <group position={pos} quaternion={quat}>
      {[-1.3, 1.3].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.6, 2.4, 0.6]} />
            <meshStandardMaterial color={th.structureColor} roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, 2.55, 0]} castShadow>
            <coneGeometry args={[0.5, 0.6, 4]} />
            <meshStandardMaterial color={th.accent} roughness={0.8} flatShading />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[3.4, 0.4, 0.5]} />
        <meshStandardMaterial color={WOOD} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 2.0, 0.0]}>
        <planeGeometry args={[1.4, 0.7]} />
        <meshStandardMaterial color={th.accent} side={THREE.DoubleSide} emissive={th.accent} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// ---- cosmic / rock heroes ---------------------------------------------------
function Observatory({ dir, base, yaw, th }: HeroProps) {
  const quat = useSurfaceQuat(dir, yaw);
  const pos = useHeroPos(dir, base, 0.2);
  return (
    <group position={pos} quaternion={quat}>
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.5, 1.2, 16]} />
        <meshStandardMaterial color={STONE} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[1.25, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.85} flatShading />
      </mesh>
      {/* telescope poking out of a slit */}
      <mesh position={[0.2, 2.1, 0.2]} rotation={[0.7, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.24, 1.6, 10]} />
        <meshStandardMaterial color={th.structureColor} roughness={0.6} metalness={0.5} flatShading />
      </mesh>
      <mesh position={[0.55, 2.7, 0.5]}>
        <icosahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial color={th.accent} emissive={th.accent} emissiveIntensity={1.2} />
      </mesh>
      <pointLight position={[0.6, 2.7, 0.55]} color={th.accent} intensity={1.2} distance={7} decay={2} />
    </group>
  );
}

function CaveMouth({ dir, base, yaw, th }: HeroProps) {
  const quat = useSurfaceQuat(dir, yaw);
  const pos = useHeroPos(dir, base, 0.1);
  return (
    <group position={pos} quaternion={quat}>
      {/* a ring of boulders forming an entrance */}
      {Array.from({ length: 9 }).map((_, i) => {
        const a = Math.PI * (0.1 + (i / 8) * 0.8);
        const r = 1.7;
        return (
          <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r * 0.9, 0]} scale={[0.7, 0.7, 1.0]} rotation={[0, 0, a]} castShadow receiveShadow>
            <dodecahedronGeometry args={[0.55, 0]} />
            <meshStandardMaterial color={th.rockColor} roughness={1} flatShading />
          </mesh>
        );
      })}
      {/* dark interior */}
      <mesh position={[0, 0.9, -0.5]}>
        <circleGeometry args={[1.25, 20]} />
        <meshStandardMaterial color="#0a0a12" roughness={1} />
      </mesh>
      <mesh position={[0, 0.5, -0.3]}>
        <icosahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={th.accent} emissive={th.accent} emissiveIntensity={1.0} flatShading />
      </mesh>
    </group>
  );
}

function PrismMonolith({ dir, base, yaw, th }: HeroProps) {
  const quat = useSurfaceQuat(dir, yaw);
  const pos = useHeroPos(dir, base, 0.3);
  const shards: [number, number, number, number, number][] = [
    [0, 0, 0, 1.0, 3.4],
    [0.7, 0, 0.3, 0.6, 2.2],
    [-0.6, 0, 0.4, 0.55, 2.0],
    [0.2, 0, -0.6, 0.5, 1.6],
  ];
  return (
    <group position={pos} quaternion={quat}>
      {shards.map((s, i) => (
        <mesh key={i} position={[s[0], s[4] / 2, s[2]]} scale={[s[3], s[4], s[3]]} rotation={[0, i, 0.04 * (i - 1)]} castShadow>
          <octahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial
            color={i % 2 ? th.accent : th.accent2}
            emissive={i % 2 ? th.accent : th.accent2}
            emissiveIntensity={0.55}
            roughness={0.15}
            metalness={0.1}
            flatShading
          />
        </mesh>
      ))}
      <pointLight position={[0, 2.0, 0]} color={th.accent} intensity={1.4} distance={9} decay={2} />
    </group>
  );
}

// ---- machine heroes ---------------------------------------------------------
function AntennaTower({ dir, base, yaw, th }: HeroProps) {
  const quat = useSurfaceQuat(dir, yaw);
  const pos = useHeroPos(dir, base, 0.2);
  const blink = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (blink.current)
      blink.current.emissiveIntensity = 0.4 + (Math.sin(state.clock.elapsedTime * 4) > 0.6 ? 2.2 : 0.2);
  });
  return (
    <group position={pos} quaternion={quat}>
      {/* lattice mast: stacked tapering boxes */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[0, 0.5 + i * 0.85, 0]} rotation={[0, i * 0.2, 0]} castShadow>
          <boxGeometry args={[0.5 - i * 0.07, 0.85, 0.5 - i * 0.07]} />
          <meshStandardMaterial color={th.structureColor} roughness={0.5} metalness={0.6} flatShading wireframe={false} />
        </mesh>
      ))}
      {/* dish */}
      <mesh position={[0.55, 3.2, 0]} rotation={[0, 0, -0.5]} castShadow>
        <sphereGeometry args={[0.55, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={STONE} roughness={0.6} metalness={0.4} flatShading side={THREE.DoubleSide} />
      </mesh>
      {/* blinking beacon */}
      <mesh position={[0, 4.6, 0]}>
        <icosahedronGeometry args={[0.16, 0]} />
        <meshStandardMaterial ref={blink} color={"#ff5b6e"} emissive={"#ff5b6e"} emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

function Factory({ dir, base, yaw, th }: HeroProps) {
  const quat = useSurfaceQuat(dir, yaw);
  const pos = useHeroPos(dir, base, 0.15);
  return (
    <group position={pos} quaternion={quat}>
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 1.4, 1.6]} />
        <meshStandardMaterial color={th.structureColor} roughness={0.7} metalness={0.4} flatShading />
      </mesh>
      <mesh position={[-0.7, 1.7, 0]} castShadow>
        <boxGeometry args={[0.9, 0.8, 1.4]} />
        <meshStandardMaterial color={th.structureColor} roughness={0.7} metalness={0.4} flatShading />
      </mesh>
      {/* chimneys */}
      {[0.5, 0.95].map((x, i) => (
        <mesh key={i} position={[x, 1.9, -0.3]} castShadow>
          <cylinderGeometry args={[0.16, 0.2, 1.4, 8]} />
          <meshStandardMaterial color={STONE_DARK} roughness={0.8} flatShading />
        </mesh>
      ))}
      {/* glowing vents */}
      {[-0.9, -0.4, 0.1].map((x, i) => (
        <mesh key={i} position={[x, 0.7, 0.81]}>
          <boxGeometry args={[0.22, 0.3, 0.05]} />
          <meshStandardMaterial color={th.accent} emissive={th.accent} emissiveIntensity={1.3} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// Each hero kind maps to a component.
const HEROES = {
  arch: Arch,
  dais: Dais,
  signpost: Signpost,
  giantTree: GiantTree,
  rootArch: RootArch,
  lighthouse: Lighthouse,
  pier: Pier,
  windmill: Windmill,
  townGate: TownGate,
  observatory: Observatory,
  caveMouth: CaveMouth,
  prism: PrismMonolith,
  antenna: AntennaTower,
  factory: Factory,
} as const;

type HeroKind = keyof typeof HEROES;

// Biome -> ordered list of hero structures (placed at successive spots). The
// last "portal" entry is rendered by the dedicated Portal component.
const HERO_SETS: Record<string, (HeroKind | "portal")[]> = {
  Meadow: ["arch", "dais", "portal", "signpost"],
  Sakura: ["arch", "signpost", "portal", "dais"],
  Tundra: ["prism", "arch", "signpost"],
  Desert: ["caveMouth", "arch", "signpost"],
  Mushroom: ["arch", "dais", "portal", "signpost"],
  Coral: ["lighthouse", "pier", "signpost"],
  Lavender: ["arch", "dais", "signpost", "portal"],
  Ember: ["prism", "arch", "portal"],
  Forest: ["giantTree", "rootArch", "signpost"],
  Ocean: ["lighthouse", "pier", "signpost"],
  Barren: ["observatory", "caveMouth", "arch"],
  Metropolis: ["windmill", "townGate", "signpost", "portal"],
  Machina: ["antenna", "factory", "portal", "signpost"],
};

// Collision footprint per hero kind, as local [x, z, radius] discs in the
// structure's own frame (x/z are ground axes; y is up). Multiple discs trace
// the actual solid parts — so arches/gates have two leg colliders you can walk
// BETWEEN, and the portal is a row of discs forming its ring wall (you go
// around the ends). Empty = walk-through (signpost).
const HERO_FOOTPRINT: Record<HeroKind | "portal", [number, number, number][]> = {
  signpost: [],
  arch: [[-0.95, 0, 0.42], [0.95, 0, 0.42]],
  rootArch: [[-1.0, 0, 0.45], [1.0, 0, 0.45]],
  townGate: [[-1.3, 0, 0.55], [1.3, 0, 0.55]],
  portal: [
    [-1.5, 0, 0.55], [-0.75, 0, 0.55], [0, 0, 0.55],
    [0.75, 0, 0.55], [1.5, 0, 0.55],
  ],
  caveMouth: [[-1.4, 0, 0.55], [1.4, 0, 0.55]],
  dais: [[0, 0, 1.8]],
  observatory: [[0, 0, 1.35]],
  factory: [[-0.7, 0, 0.85], [0.7, 0, 0.85]],
  lighthouse: [[0, 0, 0.78]],
  pier: [[0, 0.4, 0.6], [0, 1.6, 0.6], [0, 2.6, 0.6]],
  windmill: [[0, 0, 0.78]],
  giantTree: [[0, 0, 0.82]],
  prism: [[0, 0, 0.95]],
  antenna: [[0, 0, 0.5]],
};

export function Landmarks({ planet }: { planet: Planet }) {
  const th = planet.theme;
  const spots = useMemo(
    () => planet.scatter(6, mixSeed(th.seed, 0x1a2d), true),
    [planet, th.seed],
  );
  const hasRuins = th.hasRuins && spots.length >= 4;
  const set = hasRuins ? HERO_SETS[th.biome] ?? HERO_SETS.Meadow : [];

  // register hero colliders for this world (runs once per planet on mount).
  // Each footprint disc is transformed from the structure's local frame onto
  // the sphere surface so the colliders match what's actually drawn.
  const colliders = useMemo<Collider[]>(() => {
    const list: Collider[] = [];
    const off = new THREE.Vector3();
    const world = new THREE.Vector3();
    set.forEach((kind, i) => {
      const fp = HERO_FOOTPRINT[kind] ?? [[0, 0, 1.0]];
      if (!fp.length) return;
      const dir = spots[i % spots.length].dir;
      const q = makeSurfaceQuat(dir, heroYaw(th.seed, i));
      const base = planet.standRadius(dir);
      for (const [lx, lz, r] of fp) {
        off.set(lx, 0, lz).applyQuaternion(q); // tangent offset
        world.copy(dir).multiplyScalar(base).add(off).normalize();
        list.push({
          pos: world.clone().multiplyScalar(planet.standRadius(world)),
          radius: r,
        });
      }
    });
    return list;
  }, [planet, set, spots, th.seed]);
  useEffect(() => addColliders(planet.index, colliders), [planet.index, colliders]);

  if (!hasRuins) return null;

  const yawFor = (i: number) => heroYaw(th.seed, i);

  return (
    <group>
      {set.map((kind, i) => {
        const dir = spots[i % spots.length].dir;
        const b = planet.standRadius(dir);
        const yaw = yawFor(i);
        if (kind === "portal") {
          return (
            <Portal key={i} dir={dir} base={b} yaw={yaw} accent={th.accent} accent2={th.accent2} />
          );
        }
        const Hero = HEROES[kind];
        return <Hero key={i} dir={dir} base={b} yaw={yaw} th={th} />;
      })}
    </group>
  );
}
