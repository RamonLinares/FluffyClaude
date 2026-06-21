import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Planet } from "../game/planet";
import { Rng, mixSeed } from "../game/rng";

const UP = new THREE.Vector3(0, 1, 0);

interface Islet {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  scale: number;
  phase: number;
  spin: number;
}

// Small grass-topped rock chunks that drift in the sky around the planet, like
// the floating islands in the reference art. A handful, cheap, gently bobbing.
export function FloatingIslets({ planet }: { planet: Planet }) {
  const th = planet.theme;
  const groupRef = useRef<THREE.Group>(null);

  const { islets, rockGeo, grassGeo, rockMat, grassMat, crystalGeo, crystalMat } =
    useMemo(() => {
      const rng = new Rng(mixSeed(th.seed, 0xf10a7));
      const n = 7;
      const islets: Islet[] = [];
      for (let i = 0; i < n; i++) {
        const dir = new THREE.Vector3(
          rng.range(-1, 1),
          rng.range(-0.5, 1),
          rng.range(-1, 1),
        ).normalize();
        const r = planet.radius + th.amplitude + rng.range(5, 11);
        islets.push({
          pos: dir.multiplyScalar(r),
          quat: new THREE.Quaternion().setFromUnitVectors(
            UP,
            dir.clone().normalize(),
          ),
          scale: rng.range(0.6, 1.5),
          phase: rng.range(0, Math.PI * 2),
          spin: rng.range(-0.15, 0.15),
        });
      }
      const rockGeo = new THREE.ConeGeometry(0.9, 1.4, 7);
      rockGeo.translate(0, -0.55, 0);
      const grassGeo = new THREE.SphereGeometry(
        0.92,
        12,
        8,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2.1,
      );
      const crystalGeo = new THREE.OctahedronGeometry(0.18, 0);
      crystalGeo.scale(0.7, 1.8, 0.7);
      return {
        islets,
        rockGeo,
        grassGeo,
        crystalGeo,
        rockMat: new THREE.MeshStandardMaterial({
          color: th.rockColor,
          roughness: 1,
          flatShading: true,
        }),
        grassMat: new THREE.MeshStandardMaterial({
          color: th.terrainMid,
          roughness: 0.95,
          flatShading: true,
        }),
        crystalMat: new THREE.MeshStandardMaterial({
          color: th.accent,
          emissive: th.accent,
          emissiveIntensity: 0.6,
          roughness: 0.2,
          flatShading: true,
        }),
      };
    }, [planet, th]);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.children.forEach((child, i) => {
      const is = islets[i];
      if (!is) return;
      const bob = Math.sin(t * 0.5 + is.phase) * 0.4;
      child.position.copy(is.pos).addScaledVector(
        is.pos.clone().normalize(),
        bob,
      );
      child.rotateOnAxis(UP, is.spin * 0.01);
    });
  });

  if (!th.hasIslets) return null;

  return (
    <group ref={groupRef}>
      {islets.map((is, i) => (
        <group
          key={i}
          position={is.pos}
          quaternion={is.quat}
          scale={is.scale}
        >
          <mesh geometry={rockGeo} material={rockMat} castShadow />
          <mesh
            geometry={grassGeo}
            material={grassMat}
            position={[0, 0.02, 0]}
            castShadow
          />
          <mesh
            geometry={crystalGeo}
            material={crystalMat}
            position={[0.3, 0.5, 0.1]}
          />
        </group>
      ))}
    </group>
  );
}
