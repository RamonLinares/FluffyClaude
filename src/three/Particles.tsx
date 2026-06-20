import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Planet } from "../game/planet";
import { Rng } from "../game/rng";

function softTexture(): THREE.Texture {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.85)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Slow-drifting glowing motes that hang in the air around the planet for an
// ethereal, dreamy atmosphere.
export function Particles({
  planet,
  count = 280,
}: {
  planet: Planet;
  count?: number;
}) {
  const groupRef = useRef<THREE.Points>(null);
  const tex = useMemo(softTexture, []);

  const { geometry, material } = useMemo(() => {
    const rng = new Rng(planet.theme.seed ^ 0x1234);
    const positions = new Float32Array(count * 3);
    const inner = planet.radius + planet.theme.amplitude + 1.5;
    const outer = planet.radius + 9;
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        rng.range(-1, 1),
        rng.range(-1, 1),
        rng.range(-1, 1),
      ).normalize();
      const r = rng.range(inner, outer);
      positions[i * 3] = dir.x * r;
      positions[i * 3 + 1] = dir.y * r;
      positions[i * 3 + 2] = dir.z * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.5,
      map: tex,
      color: new THREE.Color(planet.theme.accent2),
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    return { geometry: geo, material: mat };
  }, [planet, count, tex]);

  useFrame((_, dt) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.02;
      groupRef.current.rotation.x += dt * 0.008;
    }
  });

  return <points ref={groupRef} geometry={geometry} material={material} />;
}
