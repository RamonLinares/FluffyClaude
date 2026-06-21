import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// A flowing aurora curtain wrapping part of the upper sky — animated vertical
// streamers with a top/bottom fade, additively blended. Used on tundra, space
// and other cold/cosmic worlds.
export function Aurora({
  color,
  color2,
}: {
  color: string;
  color2: string;
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uColor2: { value: new THREE.Color(color2) },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          uniform float uTime;
          uniform vec3 uColor;
          uniform vec3 uColor2;
          void main() {
            float v = vUv.y;
            // soft vertical fade (brighter at the bottom of the curtain)
            float fade = smoothstep(1.0, 0.25, v) * smoothstep(0.0, 0.2, v);
            // wavy vertical streamers drifting sideways
            float x = vUv.x;
            float wob = sin(x * 8.0 + uTime * 0.25) * 0.04;
            float band = sin((x + wob) * 46.0 + uTime * 0.7);
            band = pow(band * 0.5 + 0.5, 2.0);
            float band2 = sin((x - wob) * 23.0 - uTime * 0.4) * 0.5 + 0.5;
            float curtain = band * 0.7 + band2 * 0.3;
            vec3 col = mix(uColor2, uColor, v);
            float alpha = curtain * fade * 0.5;
            gl_FragColor = vec4(col, alpha);
          }
        `,
      }),
    [color, color2],
  );

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh position={[0, 26, 0]} material={material} frustumCulled={false}>
      {/* open cylinder = a curtain wrapping ~210° of the sky */}
      <cylinderGeometry args={[235, 235, 150, 100, 1, true, 0, Math.PI * 1.2]} />
    </mesh>
  );
}
