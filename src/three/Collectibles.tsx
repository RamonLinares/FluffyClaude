import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Quest, QuestTarget, MarkerKind } from "../game/quests";
import { store } from "../game/store";
import { useGame } from "../game/useGame";
import { getSoftTexture } from "./textures";

const UP = new THREE.Vector3(0, 1, 0);

function MarkerShape({ kind, color }: { kind: MarkerKind; color: string }) {
  const c = color;
  switch (kind) {
    case "orb":
      return (
        <mesh position={[0, 0.05, 0]} castShadow>
          <sphereGeometry args={[0.24, 18, 18]} />
          <meshStandardMaterial
            color={c}
            emissive={c}
            emissiveIntensity={1.3}
            roughness={0.4}
          />
        </mesh>
      );
    case "crystal":
      return (
        <mesh position={[0, 0.36, 0]} rotation={[0.2, 0.4, 0]} castShadow>
          <octahedronGeometry args={[0.34, 0]} />
          <meshStandardMaterial
            color={c}
            emissive={c}
            emissiveIntensity={0.55}
            flatShading
            metalness={0.1}
            roughness={0.25}
          />
        </mesh>
      );
    case "flower":
      return (
        <group position={[0, 0.14, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.11, 14, 14]} />
            <meshStandardMaterial color="#ffe08a" emissive="#ffe08a" emissiveIntensity={0.5} />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17]}
                scale={[0.13, 0.05, 0.09]}
                castShadow
              >
                <sphereGeometry args={[1, 12, 12]} />
                <meshStandardMaterial color={c} roughness={0.7} />
              </mesh>
            );
          })}
        </group>
      );
    case "feather":
      return (
        <group position={[0, 0.3, 0]} rotation={[0, 0, 0.5]}>
          <mesh scale={[0.12, 0.34, 0.04]} castShadow>
            <sphereGeometry args={[1, 14, 14]} />
            <meshStandardMaterial color={c} roughness={0.6} emissive={c} emissiveIntensity={0.2} />
          </mesh>
        </group>
      );
    case "lantern":
      return (
        <group position={[0, 0.32, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.18, 0.2, 0.34, 14]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.1} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <coneGeometry args={[0.2, 0.14, 14]} />
            <meshStandardMaterial color="#fff3d6" roughness={0.6} />
          </mesh>
        </group>
      );
    case "sheep":
      return (
        <group position={[0, 0.1, 0]}>
          {[
            [0, 0, 0, 0.26],
            [0.2, 0.05, 0.05, 0.18],
            [-0.18, 0.04, -0.05, 0.18],
            [0.05, 0.18, -0.1, 0.16],
            [-0.05, 0.16, 0.12, 0.16],
          ].map((p, i) => (
            <mesh key={i} position={[p[0], p[1], p[2]]} castShadow>
              <sphereGeometry args={[p[3], 14, 14]} />
              <meshStandardMaterial color="#fffafc" roughness={1} />
            </mesh>
          ))}
          <mesh position={[0.18, 0.02, 0.24]}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color={c} roughness={0.8} />
          </mesh>
        </group>
      );
    case "flag":
      return (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
            <meshStandardMaterial color="#fff7ea" roughness={0.6} />
          </mesh>
          <mesh position={[0.22, 1.0, 0]} rotation={[0, 0, 0]} castShadow>
            <planeGeometry args={[0.44, 0.28]} />
            <meshStandardMaterial color={c} side={THREE.DoubleSide} emissive={c} emissiveIntensity={0.3} />
          </mesh>
        </group>
      );
  }
}

function Marker({ target, quest }: { target: QuestTarget; quest: Quest }) {
  const inner = useRef<THREE.Group>(null);
  const sprite = useRef<THREE.Sprite>(null);
  const soft = useMemo(getSoftTexture, []);
  const quat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(UP, target.dir),
    [target],
  );
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const lift = quest.marker === "orb" || quest.marker === "sheep" ? 0 : 0;

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime + phase;
    if (inner.current) {
      inner.current.rotation.y += dt * 0.7;
      inner.current.position.y = lift + Math.sin(t * 2) * 0.08;
      const near = store.playerPos.distanceTo(target.pos);
      const target_s = near < 3 ? 1.18 : 1;
      const cur = inner.current.scale.x;
      const ns = cur + (target_s - cur) * 0.15;
      inner.current.scale.setScalar(ns);
    }
    if (sprite.current) {
      const pulse = 0.85 + Math.sin(t * 3) * 0.15;
      sprite.current.scale.setScalar(pulse * 1.3);
    }
  });

  return (
    <group position={target.pos} quaternion={quat}>
      <group ref={inner}>
        <MarkerShape kind={quest.marker} color={quest.color} />
        <sprite ref={sprite} position={[0, 0.3, 0]}>
          <spriteMaterial
            map={soft}
            color={quest.color}
            transparent
            opacity={0.7}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      </group>
    </group>
  );
}

export function Collectibles() {
  const g = useGame();
  return (
    <group>
      {g.quests.map((q) =>
        q.done
          ? null
          : q.targets.map((t) =>
              t.collected ? null : (
                <Marker key={`${q.id}:${t.id}`} target={t} quest={q} />
              ),
            ),
      )}
    </group>
  );
}
