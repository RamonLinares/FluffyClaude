import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Scene } from "./three/Scene";
import { useGame, detectQuality } from "./game/useGame";
import { initKeyboard } from "./game/input";
import { Hud } from "./ui/Hud";
import { StartScreen } from "./ui/StartScreen";
import { MenuModal, HelpModal } from "./ui/Modals";
import { Toast, Transition } from "./ui/Feedback";

const quality = detectQuality();

export default function App() {
  const g = useGame();

  useEffect(() => {
    initKeyboard();
  }, []);

  // theme the UI accent to match the current planet
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--accent", g.planet.theme.accent);
    r.setProperty("--accent2", g.planet.theme.accent2);
  }, [g.planet.index]);

  return (
    <>
      <Canvas
        shadows
        dpr={[1, quality === "high" ? 2 : 1.5]}
        gl={{
          antialias: true,
          // Opaque canvas (no alpha) avoids a transparent-canvas compositing
          // race in Chrome that can flash the whole screen black. We also let
          // the browser pick the GPU instead of forcing "high-performance",
          // which on some macOS machines triggers GPU switching / black flicker.
          alpha: false,
          powerPreference: "default",
          toneMapping: THREE.NoToneMapping,
        }}
        camera={{ fov: 52, near: 0.1, far: 600, position: [0, 14, 20] }}
        style={{ position: "fixed", inset: 0 }}
      >
        <Scene quality={quality} />
      </Canvas>

      <div className="vignette" />

      <div className="ui-root">
        {g.phase !== "start" && (
          <>
            <Hud />
          </>
        )}
      </div>

      <StartScreen />
      <MenuModal />
      <HelpModal />
      <Toast />
      <Transition />
    </>
  );
}
