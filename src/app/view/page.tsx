"use client";

import ArViewer, { type ArViewerHandle } from "@/components/ArViewer";
import { isSecureCameraContext, resetMindARModules } from "@/lib/mindar-loader";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Status = "blocked" | "preparing" | "ready" | "starting" | "running" | "error";

export default function ViewPage() {
  const arRef = useRef<ArViewerHandle>(null);
  const [status, setStatus] = useState<Status>("preparing");
  const [error, setError] = useState<string | null>(null);
  const [viewerKey, setViewerKey] = useState(0);

  useEffect(() => {
    if (!isSecureCameraContext()) {
      setStatus("blocked");
    }
  }, []);

  const handlePrepared = useCallback(() => {
    setStatus((current) => (current === "preparing" ? "ready" : current));
  }, []);

  const handlePrepareError = useCallback((message: string) => {
    setError(message);
    setStatus("error");
  }, []);

  const handleStartError = useCallback((message: string) => {
    setError(message);
    setStatus("error");
  }, []);

  const handleRetry = useCallback(() => {
    resetMindARModules();
    setError(null);
    setStatus("preparing");
    setViewerKey((key) => key + 1);
  }, []);

  const handleOpenCamera = useCallback(async () => {
    setError(null);

    if (!isSecureCameraContext()) {
      setError(
        "Camera requires HTTPS. Use your ngrok https link, deploy to Vercel, or test on localhost.",
      );
      setStatus("error");
      return;
    }

    if (!arRef.current?.isReady()) {
      setError("AR is still loading. Wait a moment and try again.");
      return;
    }

    setStatus("starting");

    try {
      await arRef.current.start();
      setStatus("running");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, []);

  const showOverlay = status !== "running";
  const buttonLabel =
    status === "preparing"
      ? "Loading AR…"
      : status === "starting"
        ? "Opening camera…"
        : "Open camera";

  return (
    <main className="relative min-h-screen bg-black text-white">
      <ArViewer
        key={viewerKey}
        ref={arRef}
        onPrepared={handlePrepared}
        onPrepareError={handlePrepareError}
        onStartError={handleStartError}
      />

      {showOverlay && (
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
          <h1 className="text-2xl font-bold">Ready to scan?</h1>

          {status === "blocked" ? (
            <p className="max-w-sm text-amber-400">
              Your phone is on an insecure connection (HTTP). Use your ngrok
              https link, deploy to Vercel, or test on localhost.
            </p>
          ) : (
            <p className="max-w-sm text-zinc-400">
              Point your camera at the wheel of fortune marker shown on the home
              page.
            </p>
          )}

          {error && (
            <p className="max-w-sm rounded-lg bg-red-950/60 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {status === "error" ? (
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-full bg-emerald-500 px-8 py-4 font-semibold text-zinc-950 transition hover:bg-emerald-400"
            >
              Try again
            </button>
          ) : status !== "blocked" ? (
            <button
              type="button"
              onClick={handleOpenCamera}
              disabled={status === "preparing" || status === "starting"}
              className="rounded-full bg-emerald-500 px-8 py-4 font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {buttonLabel}
            </button>
          ) : null}

          <Link href="/" className="text-sm text-zinc-500 underline">
            Back to home
          </Link>
        </div>
      )}

      {status === "running" && (
        <Link
          href="/"
          className="fixed top-4 left-4 z-20 rounded-full bg-black/60 px-4 py-2 text-sm text-white backdrop-blur"
        >
          ← Back
        </Link>
      )}
    </main>
  );
}
