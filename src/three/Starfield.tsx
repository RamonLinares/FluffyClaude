import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Rng, mixSeed } from "../game/rng";

function starTexture(): THREE.Texture {
  const s = 32;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.7)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A twinkling starfield on a huge shell, for deep-space worlds.
export function Starfield({
  seed,
  color,
  count = 600,
}: {
  seed: number;
  color: string;
  count?: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const tex = useMemo(starTexture, []);

  const geometry = useMemo(() => {
    const rng = new Rng(mixSeed(seed, 0x57a7));
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        rng.range(-1, 1),
        rng.range(-1, 1),
        rng.range(-1, 1),
      ).normalize();
      const r = 360;
      pos[i * 3] = dir.x * r;
      pos[i * 3 + 1] = dir.y * r;
      pos[i * 3 + 2] = dir.z * r;
      sizes[i] = rng.range(1.5, 5);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    return g;
  }, [seed, count]);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 3.2,
        map: tex,
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        fog: false,
      }),
    [tex, color],
  );

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.005;
      const m = ref.current.material as THREE.PointsMaterial;
      m.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
    }
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />;
}
