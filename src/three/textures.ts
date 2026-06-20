import * as THREE from "three";

let soft: THREE.Texture | null = null;

/** A cached soft radial-gradient sprite for glows and halos. */
export function getSoftTexture(): THREE.Texture {
  if (soft) return soft;
  const size = 128;
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
  g.addColorStop(0.25, "rgba(255,255,255,0.7)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  soft = new THREE.CanvasTexture(c);
  soft.colorSpace = THREE.SRGBColorSpace;
  return soft;
}
