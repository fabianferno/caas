/* eslint-disable react/no-unknown-property */
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import { Suspense, useRef, useCallback } from "react";
import * as THREE from "three";

/* ────────────────────────────────────────────────────────
   Single config — tweak scale / position here
──────────────────────────────────────────────────────── */
const MODEL_CONFIG = {
  targetSize: 4.0,   // model's largest dim scaled to this (world units)
  offsetY: -0.1,     // shift center up (+) or down (-)
};

/* ────────────────────────────────────────────────────────
   Module-level drag state (no re-renders needed)
──────────────────────────────────────────────────────── */
const drag = { active: false, dY: 0, dX: 0 };

/* ────────────────────────────────────────────────────────
   Auto-fit: scale + center model, back-fit camera
   Runs once on first frame after model is available
──────────────────────────────────────────────────────── */
function AutoFit({ scene }: { scene: THREE.Object3D }) {
  const done = useRef(false);

  useFrame(({ camera }) => {
    if (done.current) return;

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0) return;  // not yet loaded

    done.current = true;

    const s = MODEL_CONFIG.targetSize / maxDim;
    scene.scale.setScalar(s);

    // Re-centre after scale
    box.setFromObject(scene);
    box.getCenter(center);
    scene.position.set(-center.x, -center.y + MODEL_CONFIG.offsetY, -center.z);

    // Back-fit camera so model fills ~80 % of view
    const fovRad = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    const dist = (MODEL_CONFIG.targetSize / 2 / Math.tan(fovRad / 2)) * 1.3;
    camera.position.set(0, 0, dist);
    camera.updateProjectionMatrix();
  });

  return null;
}

/* ────────────────────────────────────────────────────────
   Robot — very slow continuous Y rotation + gentle float
   Drag nudges on top and springs back on release
──────────────────────────────────────────────────────── */
function RobotModel() {
  const { scene } = useGLTF("/robot.glb");

  // Clone once at mount via ref initialiser — no useEffect, no null guard
  const cloned = useRef(scene.clone());

  const groupRef = useRef<THREE.Group>(null);
  const t = useRef(0);
  const dragY = useRef(0);
  const dragX = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    t.current += delta;

    // Slow pendulum swing ±90°
    const autoRotY = Math.sin(t.current * 0.32) * (Math.PI / 2);
    // Subtle breath tilt on X  (±3°)
    const autoRotX = Math.sin(t.current * 0.28) * 0.052;
    // Gentle vertical float  (±small offset)
    const floatY = Math.sin(t.current * 0.45) * 0.06;

    // Drag lerp: snap to pointer while active, spring back when released
    const speed = drag.active ? 0.16 : 0.035;
    dragY.current += ((drag.active ? drag.dY : 0) - dragY.current) * speed;
    dragX.current += ((drag.active ? drag.dX : 0) - dragX.current) * speed;

    groupRef.current.rotation.y = autoRotY + dragY.current;
    groupRef.current.rotation.x = autoRotX + dragX.current;
    groupRef.current.position.y = MODEL_CONFIG.offsetY + floatY;
  });

  return (
    <group ref={groupRef}>
      <AutoFit scene={cloned.current} />
      <primitive object={cloned.current} />
    </group>
  );
}

/* ────────────────────────────────────────────────────────
   Drag capture layer
──────────────────────────────────────────────────────── */
function DragLayer({ children }: { children: React.ReactNode }) {
  const last = useRef<{ x: number; y: number } | null>(null);

  const onDown = useCallback((e: React.PointerEvent) => {
    drag.active = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!last.current) return;
    drag.dY += (e.clientX - last.current.x) * 0.009;
    drag.dX = Math.max(-0.5, Math.min(0.5,
      drag.dX + (e.clientY - last.current.y) * 0.006
    ));
    last.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onUp = useCallback(() => {
    drag.active = false;
    last.current = null;
  }, []);

  return (
    <div
      style={{ width: "100%", height: "100%", touchAction: "none", cursor: "grab", userSelect: "none" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Public export
   height: explicit px number OR "100%" to fill parent
──────────────────────────────────────────────────────── */
export default function ArmViewer({ height = 320 }: { height?: number | string }) {
  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <DragLayer>
        <Canvas
          style={{ width: "100%", height: "100%", background: "transparent" }}
          camera={{ position: [0, 0, 5], fov: 50 }}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={1.8} />
          <directionalLight position={[4, 6, 4]} intensity={2.5} color="#ffffff" />
          <directionalLight position={[-3, 1, -2]} intensity={0.8} color="#c8d8ff" />
          <pointLight position={[0, 3, 1]} intensity={1.2} color="#7b96f5" />
          <Suspense fallback={null}>
            <RobotModel />
            <Environment preset="city" />
          </Suspense>
        </Canvas>
      </DragLayer>
    </div>
  );
}

useGLTF.preload("/robot.glb");
