import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { store, Pop } from "../game/store";
import { useGame } from "../game/useGame";
import { getSoftTexture } from "./textures";

function PopSprite({ pop }: { pop: Pop }) {
  const ref = useRef<THREE.Sprite>(null);
  const mat = useRef<THREE.SpriteMaterial>(null);
  const soft = useMemo(getSoftTexture, []);
  useFrame(() => {
    const age = (performance.now() - pop.born) / 900;
    if (ref.current) ref.current.scale.setScalar(0.4 + age * 2.4);
    if (mat.current) mat.current.opacity = Math.max(0, 1 - age) * 0.9;
  });
  return (
    <sprite ref={ref} position={pop.pos}>
      <spriteMaterial
        ref={mat}
        map={soft}
        color={pop.color}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

export function Pops() {
  const g = useGame();
  useFrame(() => store.prunePops(performance.now()));
  return (
    <group>
      {g.pops.map((p) => (
        <PopSprite key={p.id} pop={p} />
      ))}
    </group>
  );
}
