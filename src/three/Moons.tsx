import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { MoonConfig } from "../game/theme";

// Low-poly moons on tilted circular orbits around the planet. Cheap (one sphere
// each), gently orbiting, some softly glowing.
export function Moons({ moons }: { moons: MoonConfig[] }) {
  const refs = useRef<(THREE.Group | null)[]>([]);

  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const orbits = useMemo(
    () =>
      moons.map((m) => {
        const tilt = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(m.tiltX, 0, m.tiltZ),
        );
        return { tilt };
      }),
    [moons],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < moons.length; i++) {
      const g = refs.current[i];
      const m = moons[i];
      if (!g) continue;
      const a = t * m.speed + m.phase;
      g.position
        .set(Math.cos(a) * m.dist, 0, Math.sin(a) * m.dist)
        .applyQuaternion(orbits[i].tilt);
      g.rotation.y += 0.003;
    }
  });

  return (
    <group>
      {moons.map((m, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          <mesh geometry={geo} scale={m.size}>
            <meshStandardMaterial
              color={m.color}
              emissive={m.emissive ?? "#000000"}
              emissiveIntensity={m.emissive ? 0.7 : 0}
              roughness={0.95}
              flatShading
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
