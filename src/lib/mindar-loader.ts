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

export type ThreeRuntime = {
  AmbientLight: new (color: number, intensity: number) => object;
  HemisphereLight: new (
    sky: number,
    ground: number,
    intensity: number,
  ) => object;
  DirectionalLight: new (color: number, intensity: number) => {
    position: { set: (x: number, y: number, z: number) => void };
  };
  AnimationMixer: new (root: object) => {
    clipAction: (clip: object) => { play: () => void };
    update: (dt: number) => void;
  };
  Clock: new () => { getDelta: () => number };
};

export type GLTFResult = {
  scene: {
    scale: { set: (x: number, y: number, z: number) => void };
    position: { set: (x: number, y: number, z: number) => void };
    rotation: { set: (x: number, y: number, z: number) => void };
    traverse: (fn: (child: object) => void) => void;
  };
  animations: object[];
};

export type GLTFLoaderRuntime = new () => {
  load: (
    url: string,
    onLoad: (gltf: GLTFResult) => void,
    onProgress: undefined,
    onError: (err: unknown) => void,
  ) => void;
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

export async function loadThreeAndGLTF(): Promise<{
  THREE: ThreeRuntime;
  GLTFLoader: GLTFLoaderRuntime;
}> {
  const THREE = (await import(
    /* webpackIgnore: true */ THREE_URL
  )) as ThreeRuntime;

  const { GLTFLoader } = (await import(
    /* webpackIgnore: true */ GLTF_LOADER_URL
  )) as { GLTFLoader: GLTFLoaderRuntime };

  return { THREE, GLTFLoader };
}

/** Makes PBR materials visible in AR (fixes all-black models). */
export function brightenModelMaterials(root: GLTFResult["scene"]): void {
  root.traverse((child) => {
    const mesh = child as {
      isMesh?: boolean;
      material?: MaterialLike | MaterialLike[];
    };
    if (!mesh.isMesh || !mesh.material) return;

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    materials.forEach((mat) => {
      if (!mat) return;
      mat.needsUpdate = true;
      if (typeof mat.metalness === "number") {
        mat.metalness = Math.min(mat.metalness, 0.3);
      }
      if (typeof mat.roughness === "number") {
        mat.roughness = Math.max(mat.roughness, 0.4);
      }
      if (typeof mat.envMapIntensity === "number") {
        mat.envMapIntensity = 1;
      }
    });
  });
}

type MaterialLike = {
  needsUpdate?: boolean;
  metalness?: number;
  roughness?: number;
  envMapIntensity?: number;
};

export function addARLights(
  THREE: ThreeRuntime,
  scene: { add: (...objects: object[]) => void },
): void {
  const ambient = new THREE.AmbientLight(0xffffff, 1.5);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
  const dir = new THREE.DirectionalLight(0xffffff, 2);
  dir.position.set(1, 2, 1);
  scene.add(ambient, hemi, dir);
}