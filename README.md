# Fluffy Planet 🌸

A relaxed, anime-pastel 3D web game. You roll a fluffy little ball across
procedurally generated dream-worlds, finishing five gentle quests on each. Clear
all five and a portal whisks you to a brand-new planet with five new quests.

Mobile-first, but fully playable on desktop. Built with **React + Three.js
(react-three-fiber) + WebGL**, with **Font Awesome** for UI icons.

Coded with Claude Code and Opus 4.8 high.

## Highlights

- **Procedural planets** — every world's terrain, palette, sky, water,
  decorations, name and quests are derived from its seed. Faceted low-poly
  terrain with soft shading, a fresnel atmosphere halo, drifting spirit-motes,
  and gentle bloom for the ethereal look.
- **Walk-on-a-sphere movement** — gravity points to the planet core; the
  fluffball rolls across the curved surface with a follow-camera.
- **A real fluffball** — instanced fur tufts, a glowing fluff-halo, blinking
  eyes, ears and blush, with a clear face that peeks through the fluff toward
  the camera. Pick its color.
- **Five quests per planet** — gather star motes, wake crystals, tend blossoms,
  find feathers, light lanterns, greet cloud-sheep, reach the summit. Roll into
  the glowing markers to complete them.
- **Save + travel codes** — progress is saved to `localStorage`. Each planet has
  a short **travel code** (e.g. `000-6B`) you can type on another device to jump
  straight back to that world.
- **Synthesized audio** — a calm ambient pad plus soft collect/quest/teleport
  chimes, generated live with the Web Audio API (no audio files to host).

## Controls

| | Move | Look |
|---|---|---|
| **Mobile** | drag the left side of the screen | drag the right side |
| **Desktop** | `WASD` / arrow keys | drag with the mouse |

## Run

```bash
npm install
npm run dev      # http://localhost:5188
npm run build    # type-check + production bundle into dist/
npm run preview  # serve the production build
```

The build uses a relative base path, so `dist/` can be dropped onto any static
host (GitHub Pages, itch.io, Netlify, …).

## Project layout

```
src/
  game/        # pure logic: rng, noise, theme, planet, quests, store,
               # storage (localStorage), shareCode (travel codes), audio, input
  three/       # r3f scene: Planet, Atmosphere, Sky, Sun, Fluffball, Player
               # (controller), Decorations, Collectibles, Pops, Particles, Effects
  ui/          # React DOM overlays: Hud, Joystick, StartScreen, Modals, Feedback
```

Planet `N` is identical on every device (a fixed `WORLD_SEED`), which is why a
travel code only needs to carry the planet index plus a checksum.
