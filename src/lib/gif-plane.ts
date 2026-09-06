import { decompressFrames, parseGIF } from "gifuct-js";
import type { AnimationController, ThreeRuntime } from "@/lib/mindar-loader";

export type TransformableObject = {
  scale: { set: (x: number, y: number, z: number) => void };
  position: { set: (x: number, y: number, z: number) => void };
  rotation: { set: (x: number, y: number, z: number) => void; y: number };
  traverse: (fn: (child: object) => void) => void;
};

type GifFrame = {
  dims: { width: number; height: number; top: number; left: number };
  delay: number;
  disposalType: number;
  patch: Uint8ClampedArray;
};

export async function loadGifOverlay(
  THREE: ThreeRuntime,
  url: string,
): Promise<{ object: TransformableObject; controller: AnimationController }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load GIF (${response.status}): ${url}`);
  }

  const parsed = parseGIF(await response.arrayBuffer());
  const frames = decompressFrames(parsed, true) as GifFrame[];
  if (frames.length === 0) {
    throw new Error("GIF has no frames.");
  }

  const width = parsed.lsd.width;
  const height = parsed.lsd.height;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create GIF canvas.");
  }

  const patchCanvas = document.createElement("canvas");
  const patchCtx = patchCanvas.getContext("2d");
  if (!patchCtx) {
    throw new Error("Could not create GIF patch canvas.");
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const aspect = height / width;
  const geometry = new THREE.PlaneGeometry(1, aspect);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material) as unknown as TransformableObject;

  let frameIndex = 0;
  let elapsedMs = 0;
  let playing = false;
  let previousImage: ImageData | null = null;

  const drawFrame = (index: number) => {
    const frame = frames[index];
    const dims = frame.dims;

    if (frame.disposalType === 3) {
      previousImage = ctx.getImageData(0, 0, width, height);
    } else {
      previousImage = null;
    }

    if (frame.disposalType === 2 && index > 0) {
      const prev = frames[index - 1].dims;
      ctx.clearRect(prev.left, prev.top, prev.width, prev.height);
    }

    patchCanvas.width = dims.width;
    patchCanvas.height = dims.height;
    const patch = patchCtx.createImageData(dims.width, dims.height);
    patch.data.set(frame.patch);
    patchCtx.putImageData(patch, 0, 0);
    ctx.drawImage(patchCanvas, dims.left, dims.top);
    texture.needsUpdate = true;
  };

  const resetToFirstFrame = () => {
    frameIndex = 0;
    elapsedMs = 0;
    ctx.clearRect(0, 0, width, height);
    drawFrame(0);
  };

  resetToFirstFrame();

  const controller: AnimationController = {
    clipSummary: `${frames.length} GIF frame(s)`,
    play() {
      resetToFirstFrame();
      playing = true;
    },
    stop() {
      playing = false;
      resetToFirstFrame();
    },
    update(dt: number) {
      if (!playing || frames.length < 2) return;

      elapsedMs += dt * 1000;
      let delay = frames[frameIndex].delay || 100;

      while (elapsedMs >= delay) {
        elapsedMs -= delay;

        if (frames[frameIndex].disposalType === 3 && previousImage) {
          ctx.putImageData(previousImage, 0, 0);
        }

        frameIndex = (frameIndex + 1) % frames.length;
        if (frameIndex === 0) {
          ctx.clearRect(0, 0, width, height);
        }
        drawFrame(frameIndex);
        delay = frames[frameIndex].delay || 100;
      }
    },
  };

  return { object: mesh, controller };
}
