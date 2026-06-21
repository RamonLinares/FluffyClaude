import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PlanetTheme } from "../game/theme";
import { Rng, mixSeed } from "../game/rng";

// One soft round cloud puff texture, reused for every billboard.
function cloudTexture(): THREE.Texture {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  // a few overlapping soft blobs so the silhouette is lumpy, not a disc
  const blob = (x: number, y: number, r: number, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.6, `rgba(255,255,255,${a * 0.7})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  blob(size * 0.42, size * 0.55, size * 0.3, 0.95);
  blob(size * 0.6, size * 0.5, size * 0.28, 0.9);
  blob(size * 0.5, size * 0.42, size * 0.26, 0.9);
  blob(size * 0.32, size * 0.5, size * 0.2, 0.8);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Drifting cloud billboards on a slowly rotating shell high above the planet.
export function Clouds({ theme, quality }: { theme: PlanetTheme; quality: "low" | "high" }) {
  const groupRef = useRef<THREE.Group>(null);
  const tex = useMemo(cloudTexture, []);

  const clouds = useMemo(() => {
    const rng = new Rng(mixSeed(theme.seed, 0xc10d));
    const max = quality === "high" ? 26 : 14;
    const n = Math.round(max * THREE.MathUtils.clamp(theme.cloudiness, 0.1, 1));
    const out: { pos: THREE.Vector3; scale: [number, number]; rot: number }[] = [];
    for (let i = 0; i < n; i++) {
      // bias clouds toward the upper hemisphere of the sky shell
      const dir = new THREE.Vector3(
        rng.range(-1, 1),
        rng.range(-0.25, 1),
        rng.range(-1, 1),
      ).normalize();
      const r = rng.range(34, 60);
      out.push({
        pos: dir.multiplyScalar(r),
        scale: [rng.range(10, 22), rng.range(6, 12)],
        rot: rng.range(-0.2, 0.2),
      });
    }
    return out;
  }, [theme, quality]);

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.004;
  });

  const mat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: tex,
        color: new THREE.Color(theme.cloudColor),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        fog: false,
      }),
    [tex, theme.cloudColor],
  );

  return (
    <group ref={groupRef}>
      {clouds.map((c, i) => (
        <sprite
          key={i}
          position={c.pos}
          scale={[c.scale[0], c.scale[1], 1]}
          material={mat}
        />
      ))}
    </group>
  );
}
