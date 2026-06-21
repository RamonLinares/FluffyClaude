import { useGame } from "../game/useGame";
import { SkyDome } from "./SkyDome";
import { Sun } from "./Sun";
import { PlanetMesh } from "./PlanetMesh";
import { Atmosphere } from "./Atmosphere";
import { Decorations } from "./Decorations";
import { Landmarks } from "./Landmarks";
import { FloatingIslets } from "./FloatingIslets";
import { Clouds } from "./Clouds";
import { Particles } from "./Particles";
import { Collectibles } from "./Collectibles";
import { Pops } from "./Pops";
import { Player } from "./Player";
import { Effects } from "./Effects";

export function Scene({ quality }: { quality: "low" | "high" }) {
  const g = useGame();
  const planet = g.planet;

  return (
    <>
      {/* opaque background so a cleared frame is never black */}
      <color attach="background" args={[planet.theme.skyBottom]} />
      <fogExp2 attach="fog" args={[planet.theme.fog, 0.013]} />
      <Sun theme={planet.theme} quality={quality} />

      {/* Everything tied to a planet remounts (and disposes GPU resources) on travel. */}
      <group key={planet.index}>
        <SkyDome theme={planet.theme} />
        <Clouds theme={planet.theme} quality={quality} />
        <PlanetMesh planet={planet} detail={quality === "high" ? 28 : 20} />
        <Atmosphere planet={planet} />
        <Decorations planet={planet} quality={quality} />
        <Landmarks planet={planet} />
        <FloatingIslets planet={planet} />
        <Particles planet={planet} count={quality === "high" ? 280 : 140} />
        <Collectibles />
      </group>

      <Pops />
      <Player quality={quality} hue={g.fluffHue} />
      {g.postFx && <Effects quality={quality} />}
    </>
  );
}
