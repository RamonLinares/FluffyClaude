Original prompt: remove the mobile circular joyistick and make the movement be that the sphere just follows where the user presses in the screen, so if he presses on the left, then sphere moves to the left, up, forward... and so on

## Progress

- Started from a clean `main` branch tracking `origin/main`.
- Current goal: replace the visible mobile joystick with full-screen press-to-move input and verify the game still builds/runs.
- Removed the `Joystick` overlay and CSS, replaced joystick state with `pressMove`, and updated README/start/help control copy.
- Added a dev/test `window.render_game_to_text()` hook exposing phase, player position, input vector, and active quest.
- `npm run build` passes with the pre-existing Vite large chunk warning.
- Browser smoke test via the web-game Playwright client passed; no console error files were produced.
- Touch-emulated check confirmed a held left-side press activates `pressMove`, moves the player, and clears on release.

## TODO

- No known blockers. Consider adding a dedicated mobile/touch regression test if automated browser coverage is expanded later.
