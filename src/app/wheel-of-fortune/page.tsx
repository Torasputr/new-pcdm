"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "starting" | "running" | "error";

export default function WheelOfFortunePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const openCamera = useCallback(async () => {
    setError(null);
    setStatus("starting");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not supported in this browser.");
      setStatus("error");
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setError("Camera needs HTTPS. Use your ngrok https link on mobile.");
      setStatus("error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }, // back camera on phones
        },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        throw new Error("Video element not found.");
      }

      video.srcObject = stream;
      await video.play();

      setStatus("running");
    } catch (err) {
      console.error(err);
      stopCamera();
      setError(
        "Could not open camera. Allow camera access, then tap Open camera again.",
      );
      setStatus("error");
    }
  }, [stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <main className="relative min-h-screen bg-black text-white">
      <video
        ref={videoRef}
        playsInline
        muted
        className={`fixed inset-0 h-full w-full object-cover ${
          status === "running" ? "block" : "hidden"
        }`}
      />

      {status !== "running" && (
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
          <h1 className="text-2xl font-bold">Wheel of Fortune</h1>
          <p className="max-w-sm text-zinc-400">
            Tap below to open your phone camera.
          </p>

          {error && (
            <p className="max-w-sm rounded-lg bg-red-950/60 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={openCamera}
            disabled={status === "starting"}
            className="rounded-full bg-emerald-500 px-8 py-4 font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {status === "starting" ? "Opening camera…" : "Open camera"}
          </button>

          <Link href="/" className="text-sm text-zinc-500 underline">
            Back to home
          </Link>
        </div>
      )}

      {status === "running" && (
        <>
          <div className="fixed top-0 right-0 left-0 z-20 bg-black/50 px-4 py-3 text-center text-sm">
            Camera is on — AR scanning comes next
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setStatus("idle");
            }}
            className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/70 px-6 py-3 text-sm text-white"
          >
            Close camera
          </button>

          <Link
            href="/"
            className="fixed top-4 left-4 z-20 rounded-full bg-black/60 px-4 py-2 text-sm text-white backdrop-blur"
          >
            ← Back
          </Link>
        </>
      )}
    </main>
  );
}