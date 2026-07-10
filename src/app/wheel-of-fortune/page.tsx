"use client";

import {
  loadMindARModules,
  loadThreeAndGLTF,
  MARKER_TARGET,
  MODEL,
} from "@/lib/mindar-loader";
import type { MindARThreeInstance } from "@/lib/mindar-loader";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "loading" | "scanning" | "error";

export default function WheelOfFortunePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindarRef = useRef<MindARThreeInstance | null>(null);
  const mixerRef = useRef<{ update: (dt: number) => void } | null>(null);
  const clockRef = useRef<{ getDelta: () => number } | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [targetFound, setTargetFound] = useState(false);
  const [scriptsReady, setScriptsReady] = useState(false);

  useEffect(() => {
    loadMindARModules()
      .then(() => setScriptsReady(true))
      .catch(() => {
        setError("Failed to load AR engine. Refresh and try again.");
        setStatus("error");
      });
  }, []);

  const stopScanner = useCallback(() => {
    const mindar = mindarRef.current;
    if (mindar) {
      mindar.renderer.setAnimationLoop(null);
      mindar.stop();
      mindarRef.current = null;
    }
    mixerRef.current = null;
    clockRef.current = null;
    setTargetFound(false);
    setStatus("idle");
  }, []);

  const openScanner = useCallback(async () => {
    setError(null);
    setTargetFound(false);
    setStatus("loading");

    const container = containerRef.current;
    if (!container) {
      setError("Scanner container not found.");
      setStatus("error");
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setError("Camera needs HTTPS. Use your ngrok or Vercel link on mobile.");
      setStatus("error");
      return;
    }

    try {
      const [{ MindARThree }, { THREE, GLTFLoader }] = await Promise.all([
        loadMindARModules(),
        loadThreeAndGLTF(),
      ]);

      const mindarThree = new MindARThree({
        container,
        imageTargetSrc: MARKER_TARGET,
        uiLoading: "no",
        uiScanning: "no",
        uiError: "no",
      });

      mindarRef.current = mindarThree;

      const anchor = mindarThree.addAnchor(0);
      anchor.onTargetFound = () => setTargetFound(true);
      anchor.onTargetLost = () => setTargetFound(false);

      const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
      (mindarThree.scene as import("three").Scene).add(light);

      const loader = new GLTFLoader();
      loader.load(
        MODEL,
        (gltf) => {
          gltf.scene.scale.set(0.3, 0.3, 0.3);
          gltf.scene.position.set(0, 0, 0);
          gltf.scene.rotation.set(0, 0, 0);
          anchor.group.add(gltf.scene);

          if (gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(gltf.scene);
            mixer.clipAction(gltf.animations[0]).play();
            mixerRef.current = mixer;
            clockRef.current = new THREE.Clock();
          }
        },
        undefined,
        (err) => {
          console.error("GLB load failed:", err);
          setError("Failed to load 3D model.");
          setStatus("error");
        },
      );

      await mindarThree.start();

      const { renderer, scene, camera } = mindarThree;
      renderer.setAnimationLoop(() => {
        const mixer = mixerRef.current;
        const clock = clockRef.current;
        if (mixer && clock) mixer.update(clock.getDelta());
        renderer.render(scene, camera);
      });

      setStatus("scanning");

      requestAnimationFrame(() => {
        mindarRef.current?.resize();
      });
    } catch (err) {
      console.error(err);
      stopScanner();
      setError(
        "Could not start scanner. Allow camera access and try again.",
      );
      setStatus("error");
    }
  }, [stopScanner]);

  useEffect(() => {
    return () => stopScanner();
  }, [stopScanner]);

  return (
    <main className="relative min-h-[100dvh] bg-black text-white">
      <div
        ref={containerRef}
        className={`fixed inset-0 h-[100dvh] w-full overflow-hidden ${
          status === "scanning" ? "z-0" : "-z-10"
        }`}
      />

      {status !== "scanning" && (
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
          <h1 className="text-2xl font-bold">Wheel of Fortune</h1>
          <p className="max-w-sm text-zinc-400">
            Point your camera at the marker to see the 3D animation.
          </p>

          {error && (
            <p className="max-w-sm rounded-lg bg-red-950/60 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={openScanner}
            disabled={status === "loading" || !scriptsReady}
            className="rounded-full bg-emerald-500 px-8 py-4 font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {!scriptsReady
              ? "Loading AR…"
              : status === "loading"
                ? "Opening camera…"
                : "Open camera"}
          </button>

          <Link href="/" className="text-sm text-zinc-500 underline">
            Back to home
          </Link>
        </div>
      )}

      {status === "scanning" && (
        <>
          <div className="fixed top-0 right-0 left-0 z-20 bg-black/50 px-4 py-3 text-center text-sm">
            {targetFound
              ? "Marker found — look at the 3D model"
              : "Scanning… point at the marker"}
          </div>

          <button
            type="button"
            onClick={stopScanner}
            className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/70 px-6 py-3 text-sm text-white"
          >
            Close scanner
          </button>

          <Link
            href="/"
            className="fixed top-4 left-4 z-30 rounded-full bg-black/60 px-4 py-2 text-sm text-white backdrop-blur"
          >
            ← Back
          </Link>
        </>
      )}
    </main>
  );
}