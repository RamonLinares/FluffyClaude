import * as THREE from "three";

// Circular surface colliders for big scenery (trees, ruins, portals…). The
// player controller pushes itself out of any it overlaps, so you slide around
// obstacles instead of rolling through them.
export interface Collider {
  pos: THREE.Vector3; // world position on the surface
  radius: number;
}

// One flat list per planet. Decorations + Landmarks register on mount; the list
// resets automatically when a different planet starts registering.
let currentIndex = -1;
let list: Collider[] = [];

export function addColliders(index: number, items: Collider[]) {
  if (index !== currentIndex) {
    currentIndex = index;
    list = [];
  }
  if (items.length) list = list.concat(items);
}

export function getColliders(index: number): Collider[] {
  return index === currentIndex ? list : [];
}
