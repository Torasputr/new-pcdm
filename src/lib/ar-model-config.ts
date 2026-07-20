export type ArModelTransform = {
  scale: number;
  position: { x: number; y: number; z: number };
  /** Euler rotation in degrees. */
  rotation: { x: number; y: number; z: number };
};

export const DEFAULT_AR_MODEL_TRANSFORM: ArModelTransform = {
  scale: 50,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
};

export const AR_MODEL_CONFIG_URL = "/config/ar-model.json";
export const AR_MODEL_CONFIG_API = "/api/ar-model-config";

const STORAGE_KEY = "kivycube-ar-model-config";

export function mergeArModelTransform(
  partial: Partial<ArModelTransform>,
): ArModelTransform {
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

function loadFromStorage(): ArModelTransform | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return mergeArModelTransform(JSON.parse(raw) as Partial<ArModelTransform>);
  } catch {
    return null;
  }
}

function saveToStorage(transform: ArModelTransform): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transform));
}

/** Sync load — browser localStorage only, else defaults. */
export function loadArModelTransform(): ArModelTransform {
  return loadFromStorage() ?? DEFAULT_AR_MODEL_TRANSFORM;
}

/** Load localStorage first, then public/config/ar-model.json. */
export async function fetchArModelTransform(): Promise<ArModelTransform> {
  const stored = loadFromStorage();
  if (stored) return stored;

  try {
    const response = await fetch(AR_MODEL_CONFIG_URL, { cache: "no-store" });
    if (response.ok) {
      const json = (await response.json()) as Partial<ArModelTransform>;
      return mergeArModelTransform(json);
    }
  } catch (error) {
    console.warn("Could not load ar-model.json:", error);
  }

  return DEFAULT_AR_MODEL_TRANSFORM;
}

/** Save to localStorage and public/config/ar-model.json via API. */
export async function saveArModelTransform(
  transform: ArModelTransform,
): Promise<{ ok: boolean; config: ArModelTransform }> {
  saveToStorage(transform);

  try {
    const response = await fetch(AR_MODEL_CONFIG_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transform),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        ok: boolean;
        config: ArModelTransform;
      };
      return { ok: true, config: data.config ?? transform };
    }
  } catch (error) {
    console.warn("Could not save ar-model.json via API:", error);
  }

  return { ok: false, config: transform };
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

export function downloadArModelConfig(transform: ArModelTransform): void {
  const blob = new Blob([`${JSON.stringify(transform, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ar-model.json";
  link.click();
  URL.revokeObjectURL(url);
}
