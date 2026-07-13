"use client";

import { applyArModelTransform } from "@/lib/ar-model-config";
import type { ArModelTransform } from "@/lib/ar-model-config";
import {
  addARLights,
  brightenModelMaterials,
  createAnimationController,
  loadThreeAndGLTF,
  MODEL,
} from "@/lib/mindar-loader";
import type { AnimationController } from "@/lib/mindar-loader";
import { useEffect, useRef } from "react";

type TransformableScene = {
  scale: { set: (x: number, y: number, z: number) => void };
  position: { set: (x: number, y: number, z: number) => void };
  rotation: { set: (x: number, y: number, z: number) => void };
};

type ModelPreviewProps = {
  transform: ArModelTransform;
};

export default function ModelPreview({ transform }: ModelPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelSceneRef = useRef<TransformableScene | null>(null);
  const transformRef = useRef(transform);

  transformRef.current = transform;

  useEffect(() => {
    if (modelSceneRef.current) {
      applyArModelTransform(modelSceneRef.current, transform);
    }
  }, [transform]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let animationId = 0;
    let controller: AnimationController | null = null;
    let clock: { getDelta: () => number } | null = null;
    let renderer: PreviewRenderer | null = null;

    const boot = async () => {
      const { THREE, GLTFLoader } = await loadThreeAndGLTF();
      if (disposed) return;

      const THREE_RT = THREE as ThreePreviewRuntime;
      const scene = new THREE_RT.Scene();
      const camera = new THREE_RT.PerspectiveCamera(
        45,
        container.clientWidth / Math.max(container.clientHeight, 1),
        0.01,
        100,
      );
      camera.position.set(0, 0.15, 0.6);

      renderer = new THREE_RT.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);

      addARLights(THREE, scene);

      const loader = new GLTFLoader();
      loader.load(MODEL, (gltf) => {
        if (disposed) return;

        brightenModelMaterials(gltf.scene);
        applyArModelTransform(gltf.scene, transformRef.current);
        modelSceneRef.current = gltf.scene;
        scene.add(gltf.scene);

        if (gltf.animations.length > 0) {
          controller = createAnimationController(THREE, gltf.scene, gltf.animations);
          clock = new THREE.Clock();
          controller?.play();
        }
      });

      const renderLoop = () => {
        if (disposed) return;
        animationId = requestAnimationFrame(renderLoop);
        if (controller && clock) {
          controller.update(clock.getDelta());
        }
        renderer?.render(scene, camera);
      };
      renderLoop();

      const onResize = () => {
        const width = container.clientWidth;
        const height = Math.max(container.clientHeight, 1);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer?.setSize(width, height);
      };

      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
      };
    };

    let removeResize: (() => void) | undefined;
    boot().then((fn) => {
      removeResize = fn;
    });

    return () => {
      disposed = true;
      modelSceneRef.current = null;
      cancelAnimationFrame(animationId);
      removeResize?.();
      renderer?.dispose();
      if (container.firstChild instanceof HTMLElement) {
        container.removeChild(container.firstChild);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="aspect-square w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900"
    />
  );
}

type PreviewRenderer = {
  domElement: HTMLElement;
  setPixelRatio: (ratio: number) => void;
  setSize: (w: number, h: number) => void;
  render: (scene: object, camera: object) => void;
  dispose: () => void;
};

type ThreePreviewRuntime = {
  Scene: new () => { add: (obj: object) => void };
  PerspectiveCamera: new (
    fov: number,
    aspect: number,
    near: number,
    far: number,
  ) => {
    position: { set: (x: number, y: number, z: number) => void };
    aspect: number;
    updateProjectionMatrix: () => void;
  };
  WebGLRenderer: new (params: { antialias: boolean; alpha: boolean }) => PreviewRenderer;
};
