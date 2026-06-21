import { useMemo } from "react";
import * as THREE from "three";
import { RingConfig } from "../game/theme";

// A tilted Saturn-style ring system: a flat annulus with banded, gappy colour
// driven by a shader. Semi-transparent, slowly… well, it just hangs there
// majestically (the planet spins under it visually via decorations/moons).
export function Rings({ rings }: { rings: RingConfig }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uInner: { value: rings.inner },
          uOuter: { value: rings.outer },
          uColor: { value: new THREE.Color(rings.color) },
          uColor2: { value: new THREE.Color(rings.color2) },
        },
        vertexShader: /* glsl */ `
          varying float vR;
          void main() {
            vR = length(position.xy);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vR;
          uniform float uInner;
          uniform float uOuter;
          uniform vec3 uColor;
          uniform vec3 uColor2;
          // cheap hash for banding variety
          float h(float x){ return fract(sin(x*91.17)*4337.13); }
          void main() {
            float t = (vR - uInner) / (uOuter - uInner);
            if (t < 0.0 || t > 1.0) discard;
            // concentric bands of varying brightness, with a couple of gaps
            float b = h(floor(t * 26.0));
            float fine = 0.6 + 0.4 * sin(t * 140.0);
            float gap = smoothstep(0.0, 0.04, abs(fract(t * 3.0 + 0.3) - 0.0));
            gap *= smoothstep(0.0, 0.05, abs(t - 0.45));
            float edge = smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.85, t);
            vec3 col = mix(uColor2, uColor, b) * fine;
            float alpha = (0.35 + 0.5 * b) * fine * gap * edge;
            gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
          }
        `,
      }),
    [rings],
  );

  return (
    <mesh rotation={[Math.PI / 2 + rings.tilt, 0, rings.tilt * 0.4]} material={material} frustumCulled={false}>
      <ringGeometry args={[rings.inner, rings.outer, 128, 1]} />
    </mesh>
  );
}
