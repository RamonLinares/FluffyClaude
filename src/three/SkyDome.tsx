import { useMemo } from "react";
import * as THREE from "three";
import { PlanetTheme } from "../game/theme";

export function SkyDome({ theme }: { theme: PlanetTheme }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color(theme.skyTop) },
          uHorizon: { value: new THREE.Color(theme.skyHorizon) },
          uBottom: { value: new THREE.Color(theme.skyBottom) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vDir;
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform vec3 uBottom;
          void main() {
            float h = vDir.y;
            vec3 col;
            if (h > 0.0) col = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.65));
            else col = mix(uHorizon, uBottom, pow(clamp(-h, 0.0, 1.0), 0.9));
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [theme],
  );

  return (
    <mesh material={material} frustumCulled={false}>
      <sphereGeometry args={[420, 32, 24]} />
    </mesh>
  );
}
