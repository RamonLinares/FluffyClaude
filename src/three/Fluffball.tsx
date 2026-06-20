import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const BODY_R = 0.5;

function hsl(h: number, s: number, l: number) {
  return new THREE.Color().setHSL((((h % 360) + 360) % 360) / 360, s, l);
}

export function Fluffball({
  hue,
  furCount = 900,
}: {
  hue: number;
  furCount?: number;
}) {
  const eyesRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const blinkT = useRef(0);

  const bodyColor = useMemo(() => hsl(hue, 0.82, 0.74), [hue]);
  const furColor = useMemo(() => hsl(hue, 0.8, 0.78), [hue]);
  const earColor = useMemo(() => hsl(hue, 0.82, 0.7), [hue]);
  const tipColor = useMemo(() => hsl(hue, 0.55, 0.93), [hue]);

  // fresnel "fluff halo" shell
  const haloMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        uniforms: { uColor: { value: hsl(hue, 0.65, 0.9) } },
        vertexShader: /* glsl */ `
          varying vec3 vN; varying vec3 vV;
          void main(){
            vec4 wp = modelMatrix * vec4(position,1.0);
            vN = normalize(mat3(modelMatrix)*normal);
            vV = normalize(cameraPosition - wp.xyz);
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vN; varying vec3 vV; uniform vec3 uColor;
          void main(){
            float f = pow(1.0 - abs(dot(vN,vV)), 2.5);
            gl_FragColor = vec4(uColor, f*0.85);
          }
        `,
      }),
    [hue],
  );

  // short, dense, jittered tufts; a bald patch is left on the camera-facing side
  // (-Z) so the face peeks through the fluff.
  const furMatrices = useMemo(() => {
    const mats: THREE.Matrix4[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion();
    const golden = Math.PI * (3 - Math.sqrt(5));
    const HALF = 0.065;
    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < furCount; i++) {
      const y = 1 - (i + 0.5) / furCount * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      const dir = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);
      // leave the face clear
      if (dir.z < -0.45 && dir.y > -0.32 && dir.y < 0.52 && Math.abs(dir.x) < 0.55)
        continue;
      const tuft = dir
        .clone()
        .add(
          new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(
            0.55,
          ),
        )
        .normalize();
      q.setFromUnitVectors(up, tuft);
      const len = 0.5 + rand() * 0.32;
      const pos = dir
        .clone()
        .multiplyScalar(BODY_R - 0.02)
        .addScaledVector(tuft, HALF * len);
      mats.push(
        new THREE.Matrix4().compose(
          pos,
          q,
          new THREE.Vector3(0.9 + rand() * 0.3, len, 0.9 + rand() * 0.3),
        ),
      );
    }
    return mats;
  }, [furCount]);

  const onFurRef = (mesh: THREE.InstancedMesh | null) => {
    if (mesh) {
      for (let i = 0; i < furMatrices.length; i++)
        mesh.setMatrixAt(i, furMatrices[i]);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
    }
  };

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (bodyRef.current) {
      const s = 1 + Math.sin(t * 1.6) * 0.03;
      bodyRef.current.scale.set(1 + (1 - s) * 0.5, s, 1 + (1 - s) * 0.5);
    }
    blinkT.current -= dt;
    if (blinkT.current < 0) blinkT.current = 3 + Math.random() * 2.5;
    if (eyesRef.current) {
      const blink = blinkT.current < 0.16 ? 0.1 : 1;
      eyesRef.current.scale.y += (blink - eyesRef.current.scale.y) * 0.4;
    }
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(t * 4) * 0.28;
      tailRef.current.rotation.x = -0.1 + Math.sin(t * 2.3) * 0.07;
    }
  });

  return (
    <group ref={bodyRef}>
      {/* body */}
      <mesh castShadow>
        <icosahedronGeometry args={[BODY_R, 4]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={bodyColor}
          emissiveIntensity={0.28}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* fur */}
      <instancedMesh ref={onFurRef} args={[undefined, undefined, furMatrices.length]}>
        <coneGeometry args={[0.075, 0.13, 5]} />
        <meshStandardMaterial
          color={furColor}
          emissive={furColor}
          emissiveIntensity={0.22}
          roughness={1}
          metalness={0}
          flatShading
        />
      </instancedMesh>

      {/* fluff halo */}
      <mesh material={haloMat}>
        <icosahedronGeometry args={[BODY_R + 0.18, 3]} />
      </mesh>

      {/* ears */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.22, 0.44, -0.04]}
          rotation={[-0.2, 0, side * 0.35]}
          castShadow
        >
          <coneGeometry args={[0.13, 0.3, 8]} />
          <meshStandardMaterial color={earColor} roughness={1} flatShading />
        </mesh>
      ))}

      {/* face (camera-facing -Z side) */}
      <group ref={eyesRef}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.17, 0.07, -0.47]}>
            <mesh>
              <sphereGeometry args={[0.085, 18, 18]} />
              <meshStandardMaterial color="#3b3450" roughness={0.25} metalness={0} />
            </mesh>
            <mesh position={[-side * 0.025, 0.03, -0.06]}>
              <sphereGeometry args={[0.03, 10, 10]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
      </group>

      {/* blush */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.3, -0.06, -0.42]} scale={[0.11, 0.07, 0.04]}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial color="#ff8fbe" transparent opacity={0.6} />
        </mesh>
      ))}

      {/* smile */}
      <mesh position={[0, -0.06, -0.5]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.07, 0.014, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#5a4a66" roughness={0.5} />
      </mesh>

      {/* fluffy curled tail on the back (+Z), wags as you go */}
      <group ref={tailRef} position={[0, -0.05, 0.46]}>
        {[
          [0, 0.0, 0.06, 0.17],
          [0, 0.1, 0.2, 0.14],
          [0, 0.24, 0.3, 0.11],
        ].map((p, i) => (
          <mesh key={i} position={[p[0], p[1], p[2]]} castShadow>
            <sphereGeometry args={[p[3], 14, 14]} />
            <meshStandardMaterial
              color={furColor}
              emissive={furColor}
              emissiveIntensity={0.18}
              roughness={1}
            />
          </mesh>
        ))}
        {/* light fluffy tip */}
        <mesh position={[0, 0.36, 0.34]} castShadow>
          <sphereGeometry args={[0.08, 14, 14]} />
          <meshStandardMaterial color={tipColor} emissive={tipColor} emissiveIntensity={0.3} roughness={1} />
        </mesh>
      </group>
    </group>
  );
}
