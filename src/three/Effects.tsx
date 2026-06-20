import { memo } from "react";
import * as THREE from "three";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

// Optional dreamy glow (opt-in via the menu). Configured for maximum GPU
// compatibility: an 8-bit frame buffer with no MSAA and no mipmap blur, since
// the half-float / multisampled / mipmap paths are what trigger full-screen
// black flicker on some macOS GPUs. Memoized so it never re-renders from game
// state changes (a re-rendered EffectComposer can flash a black frame).
export const Effects = memo(function Effects(_props: { quality: "low" | "high" }) {
  return (
    <EffectComposer
      multisampling={0}
      enableNormalPass={false}
      frameBufferType={THREE.UnsignedByteType}
    >
      <Bloom intensity={0.55} luminanceThreshold={0.7} luminanceSmoothing={0.3} radius={0.6} />
      <Vignette offset={0.25} darkness={0.42} eskil={false} />
    </EffectComposer>
  );
});
