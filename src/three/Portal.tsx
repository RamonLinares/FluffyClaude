import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const STONE = "#e7e0d6";
const STONE_DARK = "#cfc6b6";

// The signature glowing gate from the reference art: a stone ring framing a
// swirling magical vortex. Purely decorative ambience (travel still happens on
// quest completion), but it anchors each ruin like a little sanctuary.
export function Portal({
  dir,
  base,
  yaw,
  accent,
  accent2,
}: {
  dir: THREE.Vector3;
  base: number;
  yaw: number;
  accent: string;
  accent2: string;
}) {
  const quat = useMemo(() => {
    const qDir = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir,
    );
    const qYaw = new THREE.Quaternion().setFromAxisAngle(dir, yaw);
    return qYaw.multiply(qDir);
  }, [dir, yaw]);
  const pos = useMemo(() => dir.clone().multiplyScalar(base - 0.2), [dir, base]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: new THREE.Color(accent) },
          uColorB: { value: new THREE.Color(accent2) },
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
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          void main() {
            vec2 p = vUv * 2.0 - 1.0;
            float r = length(p);
            if (r > 1.0) discard;
            float a = atan(p.y, p.x);
            // two interleaved spiral arms pulled toward the centre
            float swirl = sin(a * 2.0 + uTime * 1.6 - r * 9.0) * 0.5 + 0.5;
            float swirl2 = sin(a * 3.0 - uTime * 2.1 - r * 6.0) * 0.5 + 0.5;
            float s = mix(swirl, swirl2, 0.5);
            s = pow(s, 1.6); // sharpen the arms so the spiral reads
            float edge = smoothstep(1.0, 0.5, r);    // soft outer fade
            float core = smoothstep(0.42, 0.0, r);    // glowing eye
            vec3 col = mix(uColorB, uColorA, s);
            col = mix(col, uColorA, core * 0.6);       // tint the eye, keep colour
            float alpha = edge * (0.4 + s * 0.55) + core * 0.3;
            gl_FragColor = vec4(col, min(alpha, 0.92) * edge);
          }
        `,
      }),
    [accent, accent2],
  );

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt;
  });

  const R = 1.9; // ring radius
  const CY = 2.3; // ring centre height above base
  const blocks = 16;

  return (
    <group position={pos} quaternion={quat}>
      {/* base plinth */}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 0.4, 0.95]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.95} flatShading />
      </mesh>
      {/* ring of weathered stones */}
      {Array.from({ length: blocks }).map((_, i) => {
        const ang = (i / blocks) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(ang) * R, CY + Math.sin(ang) * R, 0]}
            rotation={[0, 0, ang]}
            castShadow
          >
            <boxGeometry args={[0.52, 0.66, 0.66]} />
            <meshStandardMaterial
              color={i % 2 ? STONE_DARK : STONE}
              roughness={0.95}
              flatShading
            />
          </mesh>
        );
      })}
      {/* swirling vortex */}
      <mesh position={[0, CY, 0.06]} material={material}>
        <circleGeometry args={[R - 0.18, 48]} />
      </mesh>
      {/* keystone crystal */}
      <mesh position={[0, CY + R + 0.15, 0]} castShadow>
        <octahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.85}
          flatShading
        />
      </mesh>
      <pointLight
        position={[0, CY, 0.8]}
        color={accent}
        intensity={2.2}
        distance={9}
        decay={2}
      />
    </group>
  );
}
