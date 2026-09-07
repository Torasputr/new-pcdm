import type { TransformableObject } from "@/lib/gif-plane";
import type { AnimationController, ThreeRuntime } from "@/lib/mindar-loader";

export async function loadVideoOverlay(
  THREE: ThreeRuntime,
  url: string,
): Promise<{ object: TransformableObject; controller: AnimationController }> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.preload = "auto";

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () =>
      reject(new Error(`Failed to load video: ${url}`));
    video.src = url;
    video.load();
  });

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error("Video has no dimensions.");
  }

  const texture = new THREE.VideoTexture(video);
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

  const controller: AnimationController = {
    clipSummary: "video",
    play() {
      video.currentTime = 0;
      void video.play();
    },
    stop() {
      video.pause();
      video.currentTime = 0;
    },
    update() {
      texture.needsUpdate = true;
    },
  };

  return { object: mesh, controller };
}
