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

  const planetMat = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.95,
      metalness: 0.0,
      envMapIntensity: 0.3,
    });
    // A soft sky-tinted fresnel rim so the terrain glows at grazing angles —
    // gives the faceted low-poly land a painterly, atmospheric edge.
    const rimColor = new THREE.Color(planet.theme.skyHorizon);
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uRimColor = { value: rimColor };
      shader.uniforms.uRimPower = { value: 2.6 };
      shader.uniforms.uRimStrength = { value: planet.theme.space ? 0.5 : 0.34 };
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform vec3 uRimColor;\nuniform float uRimPower;\nuniform float uRimStrength;",
        )
        .replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>
           {
             float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), uRimPower);
             gl_FragColor.rgb += uRimColor * rim * uRimStrength;
           }`,
        );
    };
    mat.customProgramCacheKey = () => "planet-rim-v1";
    return mat;
  }, [planet]);

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
