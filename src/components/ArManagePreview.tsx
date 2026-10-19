"use client";

import { applyArModelTransform } from "@/lib/ar-model-config";
import type { ArModelTransform } from "@/lib/ar-model-config";
import type { TransformableObject } from "@/lib/gif-plane";
import { loadPngSequenceOverlay } from "@/lib/png-sequence-plane";
import {
  addARLights,
  bindMindARResize,
  combineAnimationControllers,
  GLB_MODEL,
  loadGlbOverlay,
  loadMindARModules,
  loadThreeAndGLTF,
  MARKER_TARGET,
} from "@/lib/mindar-loader";
import type {
  AnimationController,
  GLTFResult,
  MindARThreeInstance,
} from "@/lib/mindar-loader";
import { useEffect, useRef, useState } from "react";

type ArManagePreviewProps = {
  transform: ArModelTransform;
  active: boolean;
  onStatusChange?: (
    status: "idle" | "loading" | "ready" | "error",
    message?: string,
  ) => void;
};

export default function ArManagePreview({
  transform,
  active,
  onStatusChange,
}: ArManagePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindarRef = useRef<MindARThreeInstance | null>(null);
  const pngSceneRef = useRef<TransformableObject | null>(null);
  const glbSceneRef = useRef<GLTFResult["scene"] | null>(null);
  const transformRef = useRef(transform);
  const controllerRef = useRef<AnimationController | null>(null);
  const clockRef = useRef<{ getDelta: () => number } | null>(null);
  const markerVisibleRef = useRef(false);
  const unbindResizeRef = useRef<(() => void) | null>(null);
  const [targetFound, setTargetFound] = useState(false);

  transformRef.current = transform;

  useEffect(() => {
    if (pngSceneRef.current) {
      applyArModelTransform(pngSceneRef.current, transform);
      pngSceneRef.current.position.set(
        transform.position.x,
        transform.position.y,
        transform.position.z + 0.02,
      );
    }
    if (glbSceneRef.current) {
      applyArModelTransform(glbSceneRef.current, transform.glb);
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

      controllerRef.current?.stop();
      pngSceneRef.current = null;
      glbSceneRef.current = null;
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
          maxTrack: 1,
          uiLoading: "no",
          uiScanning: "no",
          uiError: "no",
          filterMinCF: 0.0001,
          warmupTolerance: 1,
          missTolerance: 20,
        });

        mindarRef.current = mindarThree;
        mindarThree.renderer.setClearColor?.(0x000000, 0);
        if (mindarThree.cssRenderer) {
          mindarThree.cssRenderer.domElement.style.pointerEvents = "none";
          mindarThree.cssRenderer.domElement.style.display = "none";
        }

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

        await mindarThree.start();
        if (disposed) {
          stop();
          return;
        }

        unbindResizeRef.current = bindMindARResize(mindarThree, container);

        const { renderer, scene, camera } = mindarThree;
        renderer.setAnimationLoop(() => {
          const overlayController = controllerRef.current;
          const clock = clockRef.current;
          if (overlayController && clock) {
            overlayController.update(clock.getDelta());
          }
          renderer.render(scene, camera);
        });

        onStatusChange?.("ready");

        const [pngOverlay, glbOverlay] = await Promise.all([
          loadPngSequenceOverlay(THREE),
          loadGlbOverlay(THREE, GLTFLoader, GLB_MODEL),
        ]);
        if (disposed) {
          stop();
          return;
        }

        applyArModelTransform(pngOverlay.object, transformRef.current);
        pngOverlay.object.position.set(
          transformRef.current.position.x,
          transformRef.current.position.y,
          transformRef.current.position.z + 0.02,
        );
        pngSceneRef.current = pngOverlay.object;
        anchor.group.add(pngOverlay.object);

        applyArModelTransform(glbOverlay.scene, transformRef.current.glb);
        glbSceneRef.current = glbOverlay.scene;
        anchor.group.add(glbOverlay.scene);

        const combined = combineAnimationControllers([
          pngOverlay.controller,
          glbOverlay.controller,
        ]);
        controllerRef.current = combined;
        clockRef.current = new THREE.Clock();
        if (markerVisibleRef.current) {
          combined.play();
        }
      } catch (err) {
        console.error(err);
        stop();
        onStatusChange?.(
          "error",
          "Could not start camera or load AR assets. Allow access and try again.",
        );
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
            : "Point at the marker to preview the sticker"}
        </p>
      </div>
    </>
  );
}
