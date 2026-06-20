import { useMemo } from "react";
import * as THREE from "three";
import { Planet } from "../game/planet";

// A soft additive fresnel shell that gives every planet a dreamy halo at the
// horizon — the "ethereal" glow.
export function Atmosphere({ planet }: { planet: Planet }) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      uniforms: {
        uColor: { value: new THREE.Color(planet.theme.skyHorizon) },
        uColor2: { value: new THREE.Color(planet.theme.accent) },
        uPower: { value: 3.2 },
        uIntensity: { value: 0.85 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormalW;
        varying vec3 vViewDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vViewDir = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormalW;
        varying vec3 vViewDir;
        uniform vec3 uColor;
        uniform vec3 uColor2;
        uniform float uPower;
        uniform float uIntensity;
        void main() {
          // BackSide normals face inward; flip for fresnel
          float f = pow(1.0 - abs(dot(vNormalW, vViewDir)), uPower);
          vec3 col = mix(uColor, uColor2, f * 0.6);
          gl_FragColor = vec4(col, f * uIntensity);
        }
      `,
    });
  }, [planet]);

  const radius = planet.radius + planet.theme.amplitude + 1.0;

  return (
    <mesh material={material} scale={1}>
      <sphereGeometry args={[radius, 64, 48]} />
    </mesh>
  );
}
