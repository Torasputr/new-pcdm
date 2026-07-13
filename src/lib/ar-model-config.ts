export type ArModelTransform = {
  scale: number;
  position: { x: number; y: number; z: number };
  /** Euler rotation in degrees. */
  rotation: { x: number; y: number; z: number };
};

export const DEFAULT_AR_MODEL_TRANSFORM: ArModelTransform = {
  scale: 20,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
};

const STORAGE_KEY = "kivycube-ar-model-config";

function mergeTransform(partial: Partial<ArModelTransform>): ArModelTransform {
  return {
    scale: partial.scale ?? DEFAULT_AR_MODEL_TRANSFORM.scale,
    position: {
      ...DEFAULT_AR_MODEL_TRANSFORM.position,
      ...partial.position,
    },
    rotation: {
      ...DEFAULT_AR_MODEL_TRANSFORM.rotation,
      ...partial.rotation,
    },
  };
}

export function loadArModelTransform(): ArModelTransform {
  if (typeof window === "undefined") {
    return DEFAULT_AR_MODEL_TRANSFORM;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AR_MODEL_TRANSFORM;
    return mergeTransform(JSON.parse(raw) as Partial<ArModelTransform>);
  } catch {
    return DEFAULT_AR_MODEL_TRANSFORM;
  }
}

export function saveArModelTransform(transform: ArModelTransform): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transform));
}

export function clearArModelTransform(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function applyArModelTransform(
  scene: {
    scale: { set: (x: number, y: number, z: number) => void };
    position: { set: (x: number, y: number, z: number) => void };
    rotation: { set: (x: number, y: number, z: number) => void };
  },
  transform: ArModelTransform,
): void {
  const deg = Math.PI / 180;
  scene.scale.set(transform.scale, transform.scale, transform.scale);
  scene.position.set(
    transform.position.x,
    transform.position.y,
    transform.position.z,
  );
  scene.rotation.set(
    transform.rotation.x * deg,
    transform.rotation.y * deg,
    transform.rotation.z * deg,
  );
}
