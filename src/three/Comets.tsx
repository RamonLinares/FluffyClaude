import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Rng, mixSeed } from "../game/rng";

function headTexture(): THREE.Texture {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const TRAIL = 7;

interface Comet {
  start: THREE.Vector3;
  vel: THREE.Vector3; // unit travel direction
  speed: number;
  len: number; // arc length to travel
  delay: number;
  dur: number;
  t: number;
}

// Occasional shooting stars that streak across the sky, each a bright head with
// a fading particle tail. More frequent on deep-space worlds.
export function Comets({
  seed,
  color,
  count = 3,
}: {
  seed: number;
  color: string;
  count?: number;
}) {
  const tex = useMemo(headTexture, []);
  const refs = useRef<(THREE.Sprite | null)[]>([]);

  const comets = useMemo<Comet[]>(() => {
    const rng = new Rng(mixSeed(seed, 0xc0e7));
    const R = 300;
    const out: Comet[] = [];
    for (let i = 0; i < count; i++) {
      const start = new THREE.Vector3(
        rng.range(-1, 1),
        rng.range(0.1, 1),
        rng.range(-1, 1),
      )
        .normalize()
        .multiplyScalar(R);
      // a travel direction roughly tangent to the sky shell
      const vel = new THREE.Vector3(
        rng.range(-1, 1),
        rng.range(-0.6, 0.2),
        rng.range(-1, 1),
      ).normalize();
      out.push({
        start,
        vel,
        speed: rng.range(120, 200),
        len: rng.range(160, 260),
        delay: rng.range(1, 7),
        dur: 0,
        t: rng.range(0, 6),
      });
      out[i].dur = out[i].len / out[i].speed;
    }
    return out;
  }, [seed, count]);

  const headColor = useMemo(() => new THREE.Color(color), [color]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    for (let i = 0; i < comets.length; i++) {
      const c = comets[i];
      c.t += dt;
      const cycle = c.delay + c.dur;
      const local = c.t % cycle;
      const active = local >= c.delay;
      const u = active ? (local - c.delay) / c.dur : 0;
      const fade = active ? Math.sin(u * Math.PI) : 0;
      for (let k = 0; k < TRAIL; k++) {
        const sprite = refs.current[i * TRAIL + k];
        if (!sprite) continue;
        if (!active) {
          sprite.visible = false;
          continue;
        }
        sprite.visible = true;
        const dist = u * c.len - k * 4.5;
        sprite.position
          .copy(c.start)
          .addScaledVector(c.vel, dist);
        const taper = 1 - k / TRAIL;
        const sc = (k === 0 ? 9 : 6 * taper) ;
        sprite.scale.setScalar(sc);
        const m = sprite.material as THREE.SpriteMaterial;
        m.opacity = fade * taper * (k === 0 ? 1 : 0.7);
      }
    }
  });

  return (
    <group>
      {comets.flatMap((_, i) =>
        Array.from({ length: TRAIL }).map((_, k) => (
          <sprite
            key={`${i}-${k}`}
            ref={(el) => (refs.current[i * TRAIL + k] = el)}
          >
            <spriteMaterial
              map={tex}
              color={headColor}
              transparent
              opacity={0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              fog={false}
            />
          </sprite>
        )),
      )}
    </group>
  );
}
