export const MARKER_TARGET = "/markers/wheeloffortune.mind";

const THREE_URL = "/lib/three.module.js";
const MINDAR_URL = "/lib/mindar-image-three.prod.js";

export type MindARThreeConfig = {
  container: HTMLElement;
  imageTargetSrc: string;
  uiLoading?: "yes" | "no";
  uiScanning?: "yes" | "no";
  uiError?: "yes" | "no";
};

export type MindARThreeInstance = {
  addAnchor: (index: number) => {
    onTargetFound: (() => void) | null;
    onTargetLost: (() => void) | null;
  };
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