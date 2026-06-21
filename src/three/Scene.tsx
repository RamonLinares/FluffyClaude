import { useGame } from "../game/useGame";
import { SkyDome } from "./SkyDome";
import { Sun } from "./Sun";
import { Suns } from "./Suns";
import { PlanetMesh } from "./PlanetMesh";
import { Atmosphere } from "./Atmosphere";
import { Decorations } from "./Decorations";
import { Landmarks } from "./Landmarks";
import { FloatingIslets } from "./FloatingIslets";
import { Clouds } from "./Clouds";
import { Rings } from "./Rings";
import { Moons } from "./Moons";
import { Starfield } from "./Starfield";
import { Aurora } from "./Aurora";
import { Comets } from "./Comets";
import { Particles } from "./Particles";
import { Collectibles } from "./Collectibles";
import { Pops } from "./Pops";
import { Player } from "./Player";
import { Effects } from "./Effects";

export function Scene({ quality }: { quality: "low" | "high" }) {
  const g = useGame();
  const planet = g.planet;
  const th = planet.theme;

  return (
    <>
      {/* opaque background so a cleared frame is never black */}
      <color attach="background" args={[th.skyBottom]} />
      <fogExp2 attach="fog" args={[th.fog, th.fogDensity]} />
      <Sun theme={th} quality={quality} />

      {/* Everything tied to a planet remounts (and disposes GPU resources) on travel. */}
      <group key={planet.index}>
        <SkyDome theme={th} />
        <Suns suns={th.suns} />
        {th.space && (
          <Starfield seed={th.seed} color={th.starColor} count={quality === "high" ? 700 : 380} />
        )}
        {th.aurora && <Aurora color={th.auroraColor} color2={th.auroraColor2} />}
        {th.hasComets && (
          <Comets seed={th.seed} color={th.starColor} count={quality === "high" ? 3 : 2} />
        )}
        {!th.space && <Clouds theme={th} quality={quality} />}
        <PlanetMesh planet={planet} detail={quality === "high" ? 28 : 20} />
        <Atmosphere planet={planet} />
        <Decorations planet={planet} quality={quality} />
        <Landmarks planet={planet} />
        <FloatingIslets planet={planet} />
        {th.rings && <Rings rings={th.rings} />}
        {th.moons.length > 0 && <Moons moons={th.moons} />}
        <Particles planet={planet} count={quality === "high" ? 280 : 140} />
        <Collectibles />
      </group>

      <Pops />
      <Player quality={quality} hue={g.fluffHue} />
      {g.postFx && <Effects quality={quality} />}
    </>
  );
}
