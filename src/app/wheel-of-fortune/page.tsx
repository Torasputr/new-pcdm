"use client";

import { loadMindARModules, MARKER_TARGET } from "@/lib/mindar-loader";
import type { MindARThreeInstance } from "@/lib/mindar-loader";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "loading" | "scanning" | "error";

export default function WheelOfFortunePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindarRef = useRef<MindARThreeInstance | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [targetFound, setTargetFound] = useState(false);
  const [scriptsReady, setScriptsReady] = useState(false);

  // Preload MindAR scripts (no camera yet)
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
      setError("Camera needs HTTPS. Use your ngrok link on mobile.");
      setStatus("error");
      return;
    }

    try {
      const { MindARThree } = await loadMindARModules();

      const mindarThree = new MindARThree({
        container,
        imageTargetSrc: MARKER_TARGET,
      });

      mindarRef.current = mindarThree;

      const anchor = mindarThree.addAnchor(0);
      anchor.onTargetFound = () => setTargetFound(true);
      anchor.onTargetLost = () => setTargetFound(false);

      // Must run from button tap (mobile camera rule)
      await mindarThree.start();

      const { renderer, scene, camera } = mindarThree;
      renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
      });

      setStatus("scanning");
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
    <main className="relative min-h-screen bg-black text-white">
      {/* MindAR draws the camera feed inside this div */}
      <div
        ref={containerRef}
        className={`fixed inset-0 ${status === "scanning" ? "z-0" : "-z-10"}`}
      />

      {status !== "scanning" && (
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
          <h1 className="text-2xl font-bold">Wheel of Fortune</h1>
          <p className="max-w-sm text-zinc-400">
            Point your camera at the Wheel of Fortune card.
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
              ? "Object found!"
              : "Scanning… point at the marker"}
          </div>

          {targetFound && (
            <div className="fixed inset-0 z-20 flex items-center justify-center pointer-events-none">
              <div className="rounded-2xl bg-emerald-500 px-8 py-4 text-xl font-bold text-zinc-950 shadow-lg">
                Object found!
              </div>
            </div>
          )}

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