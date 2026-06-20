import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { store } from "../game/store";
import { getMove, inputState, consumeJump } from "../game/input";
import { COLLECT_RADIUS } from "../game/quests";
import { audio } from "../game/audio";
import { Fluffball } from "./Fluffball";

const SPEED = 4.4; // world units / second
const REST_LIFT = 0.46;
const JUMP_V0 = 9; // initial jump speed (units/s along the surface normal)
const GRAVITY = 24; // pulls the jump back down

export function Player({
  quality,
  hue,
}: {
  quality: "low" | "high";
  hue: number;
}) {
  const group = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();

  const ballDir = useRef(new THREE.Vector3(0, 1, 0));
  const heading = useRef(new THREE.Vector3(0, 0, 1));
  const lastPlanet = useRef(-1);
  const bobPhase = useRef(0);
  const jumpOffset = useRef(0); // height above the resting surface
  const jumpVel = useRef(0); // vertical speed along the surface normal

  // scratch
  const s = useMemo(
    () => ({
      move: new THREE.Vector2(),
      up: new THREE.Vector3(),
      camDir: new THREE.Vector3(),
      right: new THREE.Vector3(),
      moveDir: new THREE.Vector3(),
      axis: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      basis: new THREE.Matrix4(),
      targetQuat: new THREE.Quaternion(),
      worldPos: new THREE.Vector3(),
      camWanted: new THREE.Vector3(),
      lookAt: new THREE.Vector3(),
      yawQuat: new THREE.Quaternion(),
      faceTarget: new THREE.Vector3(),
      visualFwd: new THREE.Vector3(),
    }),
    [],
  );

  // dev-only: expose the camera for automated checks
  useEffect(() => {
    if (import.meta.env.DEV)
      (window as unknown as { fluffyCam: THREE.Camera }).fluffyCam = camera;
  }, [camera]);

  // camera orbit by dragging the 3D view (canvas only; HUD/joystick sit above it)
  // plus double-tap / double-click anywhere on the view to jump.
  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let lastX = 0;
    let lastTap = 0;
    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      const now = performance.now();
      if (now - lastTap < 320) {
        inputState.jumpQueued = true;
        lastTap = 0;
      } else {
        lastTap = now;
      }
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      inputState.yaw -= dx * 0.006;
    };
    const up = () => {
      dragging = false;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [gl]);

  const camDist = quality === "high" ? 6.3 : 7.0;
  const camHeight = 3.6;

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const planet = store.planet;

    // re-seat the ball when the planet changes (arrival / travel)
    if (lastPlanet.current !== planet.index) {
      lastPlanet.current = planet.index;
      if (store.playerPos.lengthSq() < 0.001) {
        ballDir.current.set(0, 1, 0);
      } else {
        ballDir.current.copy(store.playerPos).normalize();
      }
      heading.current
        .set(0, 0, 1)
        .addScaledVector(ballDir.current, -ballDir.current.z)
        .normalize();
      if (heading.current.lengthSq() < 0.01) heading.current.set(1, 0, 0);
    }

    s.up.copy(ballDir.current).normalize();

    // camera-relative forward (heading rotated by user yaw around surface up)
    s.yawQuat.setFromAxisAngle(s.up, inputState.yaw);
    s.camDir.copy(heading.current).applyQuaternion(s.yawQuat).normalize();
    // screen-right in world space (camera looks along +camDir, up = surface normal)
    s.right.copy(s.camDir).cross(s.up).normalize();

    const moving = store.phase === "playing";
    getMove(s.move);
    const mag = moving ? s.move.length() : 0;

    if (mag > 0.001) {
      s.moveDir
        .copy(s.camDir)
        .multiplyScalar(s.move.y)
        .addScaledVector(s.right, s.move.x);
      if (s.moveDir.lengthSq() > 1e-6) {
        s.moveDir.normalize();
        const standR = planet.standRadius(s.up);
        const angle = (SPEED * mag * dt) / standR;
        s.axis.copy(s.up).cross(s.moveDir).normalize();
        s.q.setFromAxisAngle(s.axis, angle);
        ballDir.current.applyQuaternion(s.q).normalize();
        // `heading` is the camera-forward tangent. We parallel-transport it with
        // the surface as the ball moves, but we DON'T rotate it toward the
        // travel direction — otherwise pressing "down" (move toward the camera)
        // would spin the camera around behind the ball. The camera only turns
        // when the player drags. Movement stays screen-relative.
        heading.current.applyQuaternion(s.q);
        bobPhase.current += dt * 9;
      }
    }

    // keep heading tangent to the (new) surface
    s.up.copy(ballDir.current).normalize();
    heading.current
      .addScaledVector(s.up, -heading.current.dot(s.up))
      .normalize();
    if (!isFinite(heading.current.x) || heading.current.lengthSq() < 0.01) {
      heading.current.set(0, 0, 1).addScaledVector(s.up, -s.up.z).normalize();
    }

    // jump (Space / double-tap): a gentle arc along the surface normal
    const grounded = jumpOffset.current <= 0.0001 && jumpVel.current <= 0;
    if (consumeJump() && moving && grounded) {
      jumpVel.current = JUMP_V0;
      audio.jump();
    }
    if (jumpVel.current !== 0 || jumpOffset.current > 0) {
      jumpVel.current -= GRAVITY * dt;
      jumpOffset.current += jumpVel.current * dt;
      if (jumpOffset.current <= 0) {
        jumpOffset.current = 0;
        jumpVel.current = 0;
      }
    }

    // place + orient the fluffball
    const standR = planet.standRadius(s.up);
    const bob = mag > 0.01 ? Math.abs(Math.sin(bobPhase.current)) * 0.12 : 0;
    s.worldPos
      .copy(s.up)
      .multiplyScalar(standR + REST_LIFT + bob + jumpOffset.current);
    store.playerPos.copy(s.worldPos);

    if (group.current) {
      group.current.position.copy(s.worldPos);

      // Face the way it's actually travelling; look back at the camera when idle.
      // (So "down"/toward-camera shows the face, "up"/away shows the back + tail.)
      // We build the target orientation and slerp the quaternion toward it — a
      // quaternion slerp takes the shortest arc and (unlike lerping antipodal
      // direction vectors) can't get stuck when the turn is ~180°.
      if (mag > 0.05) s.faceTarget.copy(s.moveDir);
      else s.faceTarget.copy(s.camDir).multiplyScalar(-1); // toward the camera
      s.faceTarget.addScaledVector(s.up, -s.faceTarget.dot(s.up));
      if (s.faceTarget.lengthSq() < 1e-6) s.faceTarget.copy(s.camDir).multiplyScalar(-1);
      s.faceTarget.normalize();

      // the face is the fluffball's local -Z, so its +Z points opposite
      s.visualFwd.copy(s.faceTarget).multiplyScalar(-1);
      s.right.copy(s.up).cross(s.visualFwd).normalize();
      s.basis.makeBasis(s.right, s.up, s.visualFwd);
      s.targetQuat.setFromRotationMatrix(s.basis);
      group.current.quaternion.slerp(s.targetQuat, mag > 0.05 ? 0.14 : 0.1);

      // squash while walking; stretch up on takeoff, squash before landing
      let vs = 1 - bob * 0.4;
      if (jumpOffset.current > 0.0001 || jumpVel.current !== 0) {
        vs = THREE.MathUtils.clamp(1 + jumpVel.current * 0.02, 0.82, 1.25);
      }
      const hs = 1 + (1 - vs) * 0.5;
      group.current.scale.set(hs, vs, hs);
    }

    // follow camera
    s.camWanted
      .copy(s.worldPos)
      .addScaledVector(s.up, camHeight)
      .addScaledVector(s.camDir, -camDist);
    camera.up.copy(s.up);
    camera.position.lerp(s.camWanted, moving ? 0.08 : 0.04);
    s.lookAt.copy(s.worldPos).addScaledVector(s.up, 0.6);
    camera.lookAt(s.lookAt);

    // collect markers
    if (moving) {
      for (const quest of store.quests) {
        if (quest.done) continue;
        for (const t of quest.targets) {
          if (t.collected) continue;
          if (s.worldPos.distanceTo(t.pos) < COLLECT_RADIUS) {
            store.collect(quest, t);
          }
        }
      }
    }
  });

  return (
    <group ref={group}>
      <Fluffball hue={hue} furCount={quality === "high" ? 900 : 420} />
    </group>
  );
}
