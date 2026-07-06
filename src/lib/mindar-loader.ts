import type * as THREE from "three";

export const THREE_URL = "/lib/three.module.js";
export const THREE_ADDONS_URL = "/lib/addons/";
export const MINDAR_URL = "/lib/mindar-image-three.prod.js";

export const MARKER_IMAGE = "/markers/wheelofortune.jpg";
export const MARKER_TARGET = "/markers/wheeloffortune.mind";
export const MODEL = "/models/wheeloffortune.glb";

export const LOAD_TIMEOUT_MS = 30_000;

export type MindARThreeInstance = {
  addAnchor: (index: number) => { group: THREE.Group };
  start: () => Promise<void>;
  stop: () => void;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
};

export type MindARModules = {
  THREE: typeof import("three");
  MindARThree: new (config: object) => MindARThreeInstance;
  GLTFLoader: typeof import("three/addons/loaders/GLTFLoader.js").GLTFLoader;
};

let modulesPromise: Promise<MindARModules> | null = null;

export function isSecureCameraContext(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.isSecureContext || window.location.hostname === "localhost")
  );
}

export function resetMindARModules(): void {
  modulesPromise = null;
}

export function formatARError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return fallback;
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function fetchMindARModules(): Promise<MindARModules> {
  const THREE = (await import(
    /* webpackIgnore: true */
    THREE_URL
  )) as typeof import("three");

  const { MindARThree } = (await import(
    /* webpackIgnore: true */
    MINDAR_URL
  )) as { MindARThree: new (config: object) => MindARThreeInstance };

  const { GLTFLoader } = (await import(
    /* webpackIgnore: true */
    `${THREE_ADDONS_URL}loaders/GLTFLoader.js`
  )) as typeof import("three/addons/loaders/GLTFLoader.js");

  return { THREE, MindARThree, GLTFLoader };
}

export function loadMindARModules(): Promise<MindARModules> {
  if (!modulesPromise) {
    modulesPromise = withTimeout(
      fetchMindARModules(),
      LOAD_TIMEOUT_MS,
      "AR engine timed out after 30 seconds. Refresh the page and try again.",
    ).catch((err) => {
      modulesPromise = null;
      throw err;
    });
  }

  return modulesPromise;
}
