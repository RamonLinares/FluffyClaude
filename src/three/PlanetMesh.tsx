import { useMemo } from "react";
import * as THREE from "three";
import { Planet } from "../game/planet";

export function PlanetMesh({
  planet,
  detail,
}: {
  planet: Planet;
  detail: number;
}) {
  const geometry = useMemo(
    () => planet.buildGeometry(detail),
    [planet, detail],
  );

  const planetMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.95,
        metalness: 0.0,
        envMapIntensity: 0.3,
      }),
    [],
  );

  const waterMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(planet.theme.sea),
        transparent: true,
        opacity: 0.72,
        roughness: 0.15,
        metalness: 0.0,
        emissive: new THREE.Color(planet.theme.sea),
        emissiveIntensity: 0.15,
      }),
    [planet],
  );

  return (
    <group>
      <mesh geometry={geometry} material={planetMat} castShadow receiveShadow />
      {planet.theme.hasSea && (
        <mesh material={waterMat}>
          <sphereGeometry args={[planet.waterRadius, 96, 64]} />
        </mesh>
      )}
    </group>
  );
}
