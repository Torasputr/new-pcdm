"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type * as THREE from "three";
import {
  MARKER_TARGET,
  MODEL,
  type MindARThreeInstance,
  formatARError,
  loadMindARModules,
} from "@/lib/mindar-loader";

export type ArViewerHandle = {
  isReady: () => boolean;
  start: () => Promise<void>;
};

type ArViewerProps = {
  imageTargetSrc?: string;
  modelSrc?: string;
  onPrepared?: () => void;
  onPrepareError?: (message: string) => void;
  onStarted?: () => void;
  onStartError?: (message: string) => void;
};

const ArViewer = forwardRef<ArViewerHandle, ArViewerProps>(function ArViewer(
  {
    imageTargetSrc = MARKER_TARGET,
    modelSrc = MODEL,
    onPrepared,
    onPrepareError,
    onStarted,
    onStartError,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindarRef = useRef<MindARThreeInstance | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);
  const preparedRef = useRef(false);
  const runningRef = useRef(false);
  const [visible, setVisible] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      isReady: () => preparedRef.current && !runningRef.current,
      start: async () => {
        const mindarThree = mindarRef.current;
        if (!mindarThree || runningRef.current) {
          throw new Error("AR is not ready yet.");
        }

        try {
          await mindarThree.start();

          const { renderer, scene, camera } = mindarThree;
          renderer.setAnimationLoop(() => {
            const mixer = mixerRef.current;
            const clock = clockRef.current;
            if (mixer && clock) mixer.update(clock.getDelta());
            renderer.render(scene, camera);
          });

          runningRef.current = true;
          setVisible(true);
          onStarted?.();
        } catch (err) {
          console.error("MindAR start failed:", err);
          const message = formatARError(
            err,
            "Camera failed to start. Allow camera access in Safari or Chrome, then tap Open camera again.",
          );
          onStartError?.(message);
          throw new Error(message);
        }
      },
    }),
    [onStarted, onStartError],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let stopped = false;

    async function prepare() {
      try {
        const { THREE, MindARThree, GLTFLoader } = await loadMindARModules();
        if (stopped) return;

        const mindarThree = new MindARThree({
          container,
          imageTargetSrc,
        });

        mindarRef.current = mindarThree;

        const { scene } = mindarThree;
        const anchor = mindarThree.addAnchor(0);

        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        scene.add(light);

        clockRef.current = new THREE.Clock();

        const loader = new GLTFLoader();
        loader.load(
          modelSrc,
          (gltf) => {
            if (stopped) return;

            gltf.scene.scale.set(0.1, 0.1, 0.1);
            gltf.scene.rotation.set(Math.PI / 2, 0, 0);
            anchor.group.add(gltf.scene);

            if (gltf.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(gltf.scene);
              mixer.clipAction(gltf.animations[0]).play();
              mixerRef.current = mixer;
            }
          },
          undefined,
          (err) => {
            console.error("Model load failed:", err);
            if (!stopped) {
              onPrepareError?.(
                formatARError(err, "Failed to load 3D model."),
              );
            }
          },
        );

        if (stopped) return;

        preparedRef.current = true;
        onPrepared?.();
      } catch (err) {
        console.error("AR prepare failed:", err);
        if (!stopped) {
          onPrepareError?.(
            formatARError(
              err,
              "Failed to load AR engine. Refresh the page and try again.",
            ),
          );
        }
      }
    }

    prepare();

    return () => {
      stopped = true;
      preparedRef.current = false;
      runningRef.current = false;
      mixerRef.current = null;
      clockRef.current = null;

      const mindarThree = mindarRef.current;
      if (mindarThree) {
        mindarThree.renderer.setAnimationLoop(null);
        mindarThree.stop();
        mindarRef.current = null;
      }
    };
  }, [imageTargetSrc, modelSrc, onPrepared, onPrepareError]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 ${visible ? "z-0" : "-z-10"}`}
      aria-hidden={!visible}
    />
  );
});

export default ArViewer;
