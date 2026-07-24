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

export const AR_MODEL_CONFIG_API = "/api/ar-model-config";

const STORAGE_KEY = "kivycube-ar-model-config";

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
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transform));
}

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

/** Load saved settings from the server (JSON file or Vercel Blob). */
export async function fetchArModelTransform(): Promise<ArModelTransform> {
  try {
    const response = await fetch(AR_MODEL_CONFIG_API, { cache: "no-store" });
    if (response.ok) {
      return mergeArModelTransform(
        (await response.json()) as Partial<ArModelTransform>,
      );
    }
  } catch (error) {
    console.warn("Could not load AR model config:", error);
  }

  return DEFAULT_AR_MODEL_TRANSFORM;
}

/** Save settings — updates public/config/ar-model.json (local) or Vercel Blob (production). */
export async function saveArModelTransform(
  transform: ArModelTransform,
): Promise<{ ok: boolean; config: ArModelTransform; error?: string }> {
  try {
    const response = await fetch(AR_MODEL_CONFIG_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transform),
    });

    const data = (await response.json()) as {
      ok?: boolean;
      config?: ArModelTransform;
      error?: string;
    };

    if (response.ok && data.ok !== false) {
      saveToStorage(data.config ?? transform);
      return { ok: true, config: data.config ?? transform };
    }

    saveToStorage(transform);

    return {
      ok: false,
      config: transform,
      error: data.error
        ? `${data.error} (saved in this browser only)`
        : "Could not save settings.",
    };
  } catch (error) {
    console.warn("Could not save AR model config:", error);
    saveToStorage(transform);
    return {
      ok: false,
      config: transform,
      error: "Could not reach the save API. Saved in this browser only.",
    };
  }
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
