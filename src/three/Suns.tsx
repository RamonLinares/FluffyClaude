import { useMemo } from "react";
import * as THREE from "three";
import { StarConfig } from "../game/theme";

function glowTexture(): THREE.Texture {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.18, "rgba(255,255,255,0.95)");
  g.addColorStop(0.45, "rgba(255,255,255,0.4)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Visible glowing star disc(s) far out in the sky — one for a normal world, two
// for a double-star system.
export function Suns({ suns }: { suns: StarConfig[] }) {
  const tex = useMemo(glowTexture, []);
  const R = 320;
  return (
    <group>
      {suns.map((s, i) => {
        const d = new THREE.Vector3(...s.dir).normalize().multiplyScalar(R);
        return (
          <sprite key={i} position={[d.x, d.y, d.z]} scale={[s.size * 3, s.size * 3, 1]}>
            <spriteMaterial
              map={tex}
              color={new THREE.Color(s.color)}
              transparent
              opacity={0.95}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              fog={false}
            />
          </sprite>
        );
      })}
    </group>
  );
}
