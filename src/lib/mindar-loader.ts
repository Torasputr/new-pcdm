export const MARKER_TARGET = "/markers/maddy.mind";
export const MODEL = "/models/wheeloffortune.glb";

const THREE_URL = "/lib/three.module.js";
const MINDAR_URL = "/lib/mindar-image-three.prod.js";
const GLTF_LOADER_URL = "/lib/addons/loaders/GLTFLoader.js";

export type MindARThreeConfig = {
  container: HTMLElement;
  imageTargetSrc: string;
  uiLoading?: "yes" | "no";
  uiScanning?: "yes" | "no";
  uiError?: "yes" | "no";
};

export type MindARAnchor = {
  group: { add: (obj: unknown) => void };
  onTargetFound: (() => void) | null;
  onTargetLost: (() => void) | null;
};

export type MindARThreeInstance = {
  addAnchor: (index: number) => MindARAnchor;
  start: () => Promise<void>;
  stop: () => void;
  resize: () => void;
  renderer: {
    render: (scene: unknown, camera: unknown) => void;
    setAnimationLoop: (cb: (() => void) | null) => void;
  };
  scene: unknown;
  camera: unknown;
};

type MindARModules = {
  MindARThree: new (config: MindARThreeConfig) => MindARThreeInstance;
};

type ThreeModule = typeof import("three");
type GLTFLoaderModule = typeof import("three/addons/loaders/GLTFLoader.js");

let modulesPromise: Promise<MindARModules> | null = null;

export async function loadMindARModules(): Promise<MindARModules> {
  if (!modulesPromise) {
    modulesPromise = (async () => {
      await import(/* webpackIgnore: true */ THREE_URL);

      const { MindARThree } = (await import(
        /* webpackIgnore: true */ MINDAR_URL
      )) as MindARModules;

      return { MindARThree };
    })().catch((err) => {
      modulesPromise = null;
      throw err;
    });
  }

  return modulesPromise;
}

export async function loadThreeAndGLTF(): Promise<{
  THREE: ThreeModule;
  GLTFLoader: GLTFLoaderModule["GLTFLoader"];
}> {
  const THREE = (await import(
    /* webpackIgnore: true */ THREE_URL
  )) as ThreeModule;

  const { GLTFLoader } = (await import(
    /* webpackIgnore: true */ GLTF_LOADER_URL
  )) as GLTFLoaderModule;

  return { THREE, GLTFLoader };
}