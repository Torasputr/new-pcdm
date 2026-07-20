"use client";

import { applyArModelTransform } from "@/lib/ar-model-config";
import type { ArModelTransform } from "@/lib/ar-model-config";
import {
  addARLights,
  bindMindARResize,
  brightenModelMaterials,
  createAnimationController,
  loadMindARModules,
  loadThreeAndGLTF,
  MARKER_TARGET,
  MODEL,
} from "@/lib/mindar-loader";
import type {
  AnimationController,
  MindARThreeInstance,
} from "@/lib/mindar-loader";
import { useEffect, useRef, useState } from "react";

type TransformableScene = {
  scale: { set: (x: number, y: number, z: number) => void };
  position: { set: (x: number, y: number, z: number) => void };
  rotation: { set: (x: number, y: number, z: number) => void };
};

type ArManagePreviewProps = {
  transform: ArModelTransform;
  active: boolean;
  onStatusChange?: (status: "idle" | "loading" | "ready" | "error", message?: string) => void;
};

export default function ArManagePreview({
  transform,
  active,
  onStatusChange,
}: ArManagePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindarRef = useRef<MindARThreeInstance | null>(null);
  const modelSceneRef = useRef<TransformableScene | null>(null);
  const transformRef = useRef(transform);
  const controllerRef = useRef<AnimationController | null>(null);
  const clockRef = useRef<{ getDelta: () => number } | null>(null);
  const markerVisibleRef = useRef(false);
  const unbindResizeRef = useRef<(() => void) | null>(null);
  const [targetFound, setTargetFound] = useState(false);

  transformRef.current = transform;

  useEffect(() => {
    if (modelSceneRef.current) {
      applyArModelTransform(modelSceneRef.current, transform);
    }
  }, [transform]);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    const stop = () => {
      unbindResizeRef.current?.();
      unbindResizeRef.current = null;
      document.documentElement.classList.remove("ar-active");

      const mindar = mindarRef.current;
      if (mindar) {
        mindar.renderer.setAnimationLoop(null);
        mindar.stop();
        mindarRef.current = null;
      }

      modelSceneRef.current = null;
      controllerRef.current = null;
      clockRef.current = null;
      markerVisibleRef.current = false;
      setTargetFound(false);
    };

    const start = async () => {
      onStatusChange?.("loading");

      if (!window.isSecureContext && window.location.hostname !== "localhost") {
        onStatusChange?.("error", "Camera needs HTTPS.");
        return;
      }

      try {
        document.documentElement.classList.add("ar-active");

        const [{ MindARThree }, { THREE, GLTFLoader }] = await Promise.all([
          loadMindARModules(),
          loadThreeAndGLTF(),
        ]);

        if (disposed) return;

        const mindarThree = new MindARThree({
          container,
          imageTargetSrc: MARKER_TARGET,
          uiLoading: "no",
          uiScanning: "no",
          uiError: "no",
        });

        mindarRef.current = mindarThree;

        const anchor = mindarThree.addAnchor(0);
        anchor.onTargetFound = () => {
          markerVisibleRef.current = true;
          setTargetFound(true);
          controllerRef.current?.play();
        };
        anchor.onTargetLost = () => {
          markerVisibleRef.current = false;
          setTargetFound(false);
          controllerRef.current?.stop();
        };

        addARLights(THREE, mindarThree.scene as { add: (...o: object[]) => void });

        const loader = new GLTFLoader();
        loader.load(
          MODEL,
          (gltf) => {
            if (disposed) return;

            applyArModelTransform(gltf.scene, transformRef.current);
            brightenModelMaterials(gltf.scene);
            modelSceneRef.current = gltf.scene;
            anchor.group.add(gltf.scene);

            if (gltf.animations.length > 0) {
              const controller = createAnimationController(
                THREE,
                gltf.scene,
                gltf.animations,
              );
              if (controller) {
                controllerRef.current = controller;
                clockRef.current = new THREE.Clock();
                if (markerVisibleRef.current) {
                  controller.play();
                }
              }
            }
          },
          undefined,
          (err) => {
            console.error("Manage AR model load failed:", err);
            onStatusChange?.("error", "Failed to load 3D model.");
          },
        );

        await mindarThree.start();
        if (disposed) {
          stop();
          return;
        }

        unbindResizeRef.current = bindMindARResize(mindarThree, container);

        const { renderer, scene, camera } = mindarThree;
        renderer.setAnimationLoop(() => {
          const controller = controllerRef.current;
          const clock = clockRef.current;
          if (controller && clock) {
            controller.update(clock.getDelta());
          }
          renderer.render(scene, camera);
        });

        onStatusChange?.("ready");
      } catch (err) {
        console.error(err);
        stop();
        onStatusChange?.("error", "Could not start camera. Allow access and try again.");
      }
    };

    start();

    return () => {
      disposed = true;
      stop();
      onStatusChange?.("idle");
    };
  }, [active, onStatusChange]);

  if (!active) return null;

  return (
    <>
      <div ref={containerRef} className="ar-scanner-container z-0" />
      <div className="pointer-events-none fixed top-14 right-0 left-0 z-20 px-4 text-center text-sm">
        <p className="inline-block rounded-full bg-black/60 px-4 py-2 backdrop-blur">
          {targetFound
            ? "Marker found — adjust sliders to tune placement"
            : "Point at the marker to preview the model"}
        </p>
      </div>
    </>
  );
}
