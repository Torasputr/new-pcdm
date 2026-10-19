import type { TransformableObject } from "@/lib/gif-plane";
import type { AnimationController, ThreeRuntime } from "@/lib/mindar-loader";

export const DEFAULT_PNG_SEQUENCE_FPS = 24;
const MAX_CANVAS_WIDTH = 1280;

const FALLBACK_FRAMES = Array.from({ length: 87 }, (_, index) => {
  const num = String(index + 1).padStart(4, "0");
  return `/pngseq/${encodeURIComponent(`SC 2 SH 15 Animasi_${num}.png`)}`;
});

export type PngSequenceOptions = {
  frameUrls?: string[];
  fps?: number;
};

async function resolveFrameUrls(customUrls?: string[]): Promise<string[]> {
  if (customUrls && customUrls.length > 0) {
    return customUrls;
  }

  try {
    const response = await fetch("/api/pngseq", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as { frames?: string[] };
      if (Array.isArray(data.frames) && data.frames.length > 0) {
        return data.frames;
      }
    }
  } catch (error) {
    console.warn("Could not fetch /api/pngseq, using fallback list:", error);
  }

  return FALLBACK_FRAMES;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load PNG frame: ${url}`));
    img.src = url;
  });
}

export async function loadPngSequenceOverlay(
  THREE: ThreeRuntime,
  options: PngSequenceOptions = {},
): Promise<{ object: TransformableObject; controller: AnimationController }> {
  const fps = options.fps ?? DEFAULT_PNG_SEQUENCE_FPS;
  const urls = await resolveFrameUrls(options.frameUrls);

  if (urls.length === 0) {
    throw new Error("No PNG sequence frames found in /public/pngseq.");
  }

  // Only download & decode each unique URL once in browser memory
  const uniqueUrlCache = new Map<string, Promise<HTMLImageElement>>();
  const images = await Promise.all(
    urls.map((url) => {
      let promise = uniqueUrlCache.get(url);
      if (!promise) {
        promise = loadImage(url);
        uniqueUrlCache.set(url, promise);
      }
      return promise;
    }),
  );

  const srcWidth = images[0].naturalWidth || images[0].width;
  const srcHeight = images[0].naturalHeight || images[0].height;

  if (!srcWidth || !srcHeight) {
    throw new Error("PNG frame has invalid dimensions.");
  }

  const scaleFactor =
    srcWidth > MAX_CANVAS_WIDTH ? MAX_CANVAS_WIDTH / srcWidth : 1;
  const width = Math.round(srcWidth * scaleFactor);
  const height = Math.round(srcHeight * scaleFactor);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create 2D context for PNG sequence canvas.");
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const aspect = srcHeight / srcWidth;
  const geometry = new THREE.PlaneGeometry(1, aspect);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(
    geometry,
    material,
  ) as unknown as TransformableObject;

  let frameIndex = 0;
  let elapsedMs = 0;
  let playing = false;
  let lastDrawnImage: HTMLImageElement | null = null;
  const frameDurationMs = 1000 / Math.max(1, fps);

  const drawFrame = (index: number) => {
    const img = images[index];
    if (!img || img === lastDrawnImage) return;
    lastDrawnImage = img;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    texture.needsUpdate = true;
  };

  const resetToFirstFrame = () => {
    frameIndex = 0;
    elapsedMs = 0;
    lastDrawnImage = null;
    drawFrame(0);
  };

  resetToFirstFrame();

  const controller: AnimationController = {
    clipSummary: `${images.length} PNG frames (${uniqueUrlCache.size} unique @ ${fps} FPS)`,
    play() {
      resetToFirstFrame();
      playing = true;
    },
    stop() {
      playing = false;
      resetToFirstFrame();
    },
    update(dt: number) {
      if (!playing || images.length < 2) return;

      elapsedMs += dt * 1000;
      if (elapsedMs >= frameDurationMs) {
        const steps = Math.floor(elapsedMs / frameDurationMs);
        elapsedMs %= frameDurationMs;
        frameIndex = (frameIndex + steps) % images.length;
        drawFrame(frameIndex);
      }
    },
  };

  return { object: mesh, controller };
}
