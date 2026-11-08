export type SingleTransform = {
  scale: number;
  position: { x: number; y: number; z: number };
  /** Euler rotation in degrees. */
  rotation: { x: number; y: number; z: number };
  /** Draw order relative to GLB internal layers (0 = behind all GLB layers, 1..18 = between GLB layers, 20 = in front of all GLB layers). */
  layerOrder?: number;
};

export type ArModelTransform = SingleTransform & {
  layerOrder: number;
  glb: SingleTransform;
};

export const DEFAULT_SINGLE_TRANSFORM: SingleTransform = {
  scale: 1,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  layerOrder: 20,
};

export const DEFAULT_GLB_TRANSFORM: SingleTransform = {
  scale: 1,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
};

export const DEFAULT_AR_MODEL_TRANSFORM: ArModelTransform = {
  ...DEFAULT_SINGLE_TRANSFORM,
  layerOrder: 20,
  glb: DEFAULT_GLB_TRANSFORM,
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

function mergeSingleTransform(
  partial: Partial<SingleTransform> | undefined,
  fallback: SingleTransform,
): SingleTransform {
  return {
    scale: partial?.scale ?? fallback.scale,
    position: {
      ...fallback.position,
      ...partial?.position,
    },
    rotation: {
      ...fallback.rotation,
      ...partial?.rotation,
    },
    ...(fallback.layerOrder !== undefined || partial?.layerOrder !== undefined
      ? { layerOrder: partial?.layerOrder ?? fallback.layerOrder ?? 20 }
      : {}),
  };
}

export function mergeArModelTransform(
  partial: Partial<ArModelTransform>,
): ArModelTransform {
  const base = mergeSingleTransform(partial, DEFAULT_SINGLE_TRANSFORM);
  return {
    ...base,
    layerOrder: base.layerOrder ?? 20,
    glb: mergeSingleTransform(partial.glb, DEFAULT_GLB_TRANSFORM),
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

  return loadFromStorage() ?? DEFAULT_AR_MODEL_TRANSFORM;
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
    renderOrder?: number;
  },
  transform: SingleTransform,
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
  if (typeof transform.layerOrder === "number") {
    scene.renderOrder = transform.layerOrder;
  }
}
