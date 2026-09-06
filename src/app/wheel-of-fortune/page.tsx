"use client";

import {
  applyArModelTransform,
  fetchArModelTransform,
} from "@/lib/ar-model-config";
import { loadGifOverlay } from "@/lib/gif-plane";
import {
  addARLights,
  bindMindARResize,
  loadMindARModules,
  loadThreeAndGLTF,
  MARKER_IMAGE,
  MARKER_TARGET,
  MODEL,
} from "@/lib/mindar-loader";
import type {
  AnimationController,
  MindARThreeInstance,
} from "@/lib/mindar-loader";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "loading" | "scanning" | "error";

export default function WheelOfFortunePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindarRef = useRef<MindARThreeInstance | null>(null);
  const mixerRef = useRef<AnimationController | null>(null);
  const clockRef = useRef<{ getDelta: () => number } | null>(null);
  const markerVisibleRef = useRef(false);
  const playAnimationRef = useRef<(() => void) | null>(null);
  const stopAnimationRef = useRef<(() => void) | null>(null);
  const unbindResizeRef = useRef<(() => void) | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [targetFound, setTargetFound] = useState(false);
  const [animationStarted, setAnimationStarted] = useState(false);
  const [modelStatus, setModelStatus] = useState<string | null>(null);
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
    unbindResizeRef.current?.();
    unbindResizeRef.current = null;
    document.documentElement.classList.remove("ar-active");

    const mindar = mindarRef.current;
    if (mindar) {
      mindar.renderer.setAnimationLoop(null);
      mindar.stop();
      mindarRef.current = null;
    }
    mixerRef.current = null;
    clockRef.current = null;
    markerVisibleRef.current = false;
    playAnimationRef.current = null;
    stopAnimationRef.current = null;
    setTargetFound(false);
    setAnimationStarted(false);
    setModelStatus(null);
    setStatus("idle");
  }, []);

  const openScanner = useCallback(async () => {
    setError(null);
    setTargetFound(false);
    setAnimationStarted(false);
    setModelStatus(null);
    markerVisibleRef.current = false;
    playAnimationRef.current = null;
    stopAnimationRef.current = null;
    setStatus("loading");
    document.documentElement.classList.add("ar-active");

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
      const [{ MindARThree }, { THREE }] = await Promise.all([
        loadMindARModules(),
        loadThreeAndGLTF(),
      ]);

      const mindarThree = new MindARThree({
        container,
        imageTargetSrc: MARKER_TARGET,
        maxTrack: 1,
        uiLoading: "no",
        uiScanning: "no",
        uiError: "no",
        filterMinCF: 0.0001,
        warmupTolerance: 1,
        missTolerance: 20,
      });

      mindarRef.current = mindarThree;
      mindarThree.renderer.setClearColor?.(0x000000, 0);
      if (mindarThree.cssRenderer) {
        mindarThree.cssRenderer.domElement.style.pointerEvents = "none";
        mindarThree.cssRenderer.domElement.style.display = "none";
      }

      const anchor = mindarThree.addAnchor(0);
      anchor.onTargetFound = () => {
        markerVisibleRef.current = true;
        setTargetFound(true);
        playAnimationRef.current?.();
      };
      anchor.onTargetLost = () => {
        markerVisibleRef.current = false;
        setTargetFound(false);
        setAnimationStarted(false);
        stopAnimationRef.current?.();
      };

      addARLights(THREE, mindarThree.scene as { add: (...o: object[]) => void });

      await mindarThree.start();

      document.documentElement.classList.add("ar-active");
      unbindResizeRef.current = bindMindARResize(mindarThree, container);

      const { renderer, scene, camera } = mindarThree;
      renderer.setAnimationLoop(() => {
        const controller = mixerRef.current;
        const clock = clockRef.current;
        if (controller && clock) {
          controller.update(clock.getDelta());
        }

        renderer.render(scene, camera);
      });

      setStatus("scanning");
      setModelStatus("Loading sticker…");

      try {
        const [modelTransform, overlay] = await Promise.all([
          fetchArModelTransform(),
          loadGifOverlay(THREE, MODEL),
        ]);
        if (mindarRef.current !== mindarThree) return;

        applyArModelTransform(overlay.object, modelTransform);
        overlay.object.position.set(
          modelTransform.position.x,
          modelTransform.position.y,
          modelTransform.position.z + 0.02,
        );
        anchor.group.add(overlay.object);

        setModelStatus(`Sticker ready — ${overlay.controller.clipSummary}`);
        mixerRef.current = overlay.controller;
        clockRef.current = new THREE.Clock();

        playAnimationRef.current = () => {
          clockRef.current = new THREE.Clock();
          overlay.controller.play();
          setAnimationStarted(true);
        };
        stopAnimationRef.current = () => {
          overlay.controller.stop();
          setAnimationStarted(false);
        };

        if (markerVisibleRef.current) {
          playAnimationRef.current();
        }
      } catch (err) {
        console.error("GIF load failed:", err);
        setModelStatus("Camera is on, but the sticker failed to load.");
      }
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
    <main
      className={`bg-black text-white ${
        status === "scanning" ? "fixed inset-0 overflow-hidden" : "relative min-h-[100dvh]"
      }`}
    >
      <div
        ref={containerRef}
        className={`ar-scanner-container ${
          status === "scanning" || status === "loading" ? "z-0" : "-z-10"
        }`}
      />

      {status !== "scanning" && (
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
          <h1 className="text-2xl font-bold">Wheel of Fortune</h1>
          <p className="max-w-sm text-zinc-400">
            Point your camera at the wheel of fortune marker below — not the cat
            sticker. The cat appears after the marker is found.
          </p>

          <img
            src={MARKER_IMAGE}
            alt="Scan this wheel of fortune marker"
            className="h-auto w-48 rounded-xl border border-zinc-700 object-cover"
          />

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

          <Link href="/manage" className="text-sm text-zinc-500 underline">
            Adjust model size &amp; position
          </Link>

          <Link href="/" className="text-sm text-zinc-500 underline">
            Back to home
          </Link>
        </div>
      )}

      {status === "scanning" && (
        <>
          <div className="fixed top-0 right-0 left-0 z-20 space-y-1 bg-black/50 px-4 py-3 text-center text-sm">
            {animationStarted ? (
              <p className="font-semibold text-emerald-300">
                Animation has started
              </p>
            ) : targetFound ? (
              <p>Marker found — starting animation…</p>
            ) : (
              <p>Scanning… point at the wheel of fortune marker</p>
            )}
            {modelStatus && (
              <p className="text-xs text-zinc-400">{modelStatus}</p>
            )}
          </div>

          <img
            src={MARKER_IMAGE}
            alt="Marker to scan"
            className="fixed right-4 bottom-24 z-30 w-20 rounded-lg border border-white/40 opacity-90"
          />

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
