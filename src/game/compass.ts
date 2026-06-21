// Lightweight, non-reactive compass state. The player controller writes the
// bearing to the nearest uncollected quest item every frame; the Compass HUD
// reads it in its own rAF loop and styles a DOM arrow directly (no React
// re-renders per frame).
export const compass = {
  visible: false,
  angle: 0, // degrees, 0 = straight ahead (up on screen), + = clockwise/right
  distance: 0, // world units to the target
  color: "#ffffff",
  icon: "fa-solid fa-gem",
};
