import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { store } from "../game/store";
import { PlanetTheme } from "../game/theme";

// A soft "sun" that gently follows the player so the play area is always lit and
// shadows stay near the fluffball (no harsh day/night terminator on the play
// surface). Shadows are kept soft and light, per the ethereal brief.
export function Sun({
  theme,
  quality,
}: {
  theme: PlanetTheme;
  quality: "low" | "high";
}) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const light = lightRef.current;
    if (!light) return;
    const p = store.playerPos;
    up.copy(p).normalize();
    // a stable tangent for a pleasant shadow angle
    tangent.set(0.3, 0.0, 0.6);
    tangent.sub(tmp.copy(up).multiplyScalar(tangent.dot(up))).normalize();

    light.position
      .copy(p)
      .addScaledVector(up, 18)
      .addScaledVector(tangent, 7);
    target.position.copy(p);
    target.updateMatrixWorld();
  });

  const mapSize = quality === "high" ? 2048 : 1024;

  return (
    <>
      <hemisphereLight
        color={new THREE.Color(theme.skyHorizon)}
        groundColor={new THREE.Color(theme.terrainMid)}
        intensity={0.85}
      />
      <ambientLight color={new THREE.Color(theme.ambientColor)} intensity={0.35} />
      <directionalLight
        ref={lightRef}
        color={new THREE.Color(theme.sunColor)}
        intensity={theme.sunIntensity}
        castShadow
        shadow-mapSize-width={mapSize}
        shadow-mapSize-height={mapSize}
        shadow-camera-near={1}
        shadow-camera-far={48}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-bias={-0.0004}
        shadow-normalBias={0.5}
        shadow-radius={quality === "high" ? 7 : 4}
        target={target}
      />
      <primitive object={target} />
    </>
  );
}
