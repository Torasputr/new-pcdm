"use client";

import ArManagePreview from "@/components/ArManagePreview";
import {
  DEFAULT_AR_MODEL_TRANSFORM,
  loadArModelTransform,
  saveArModelTransform,
  type ArModelTransform,
} from "@/lib/ar-model-config";
import { loadMindARModules } from "@/lib/mindar-loader";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type Axis = "x" | "y" | "z";
type CameraStatus = "idle" | "loading" | "ready" | "error";

export default function ManagePage() {
  const [transform, setTransform] = useState<ArModelTransform>(
    DEFAULT_AR_MODEL_TRANSFORM,
  );
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [scriptsReady, setScriptsReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    setTransform(loadArModelTransform());
    loadMindARModules()
      .then(() => setScriptsReady(true))
      .catch(() => setCameraError("Failed to load AR engine."));
  }, []);

  const handleCameraStatus = useCallback(
    (status: CameraStatus, message?: string) => {
      setCameraStatus(status);
      if (status === "error") {
        setCameraError(message ?? "Camera error.");
        setCameraActive(false);
      } else {
        setCameraError(null);
      }
    },
    [],
  );

  const updateScale = (scale: number) => {
    setTransform((current) => ({ ...current, scale }));
  };

  const updatePosition = (axis: Axis, value: number) => {
    setTransform((current) => ({
      ...current,
      position: { ...current.position, [axis]: value },
    }));
  };

  const updateRotation = (axis: Axis, value: number) => {
    setTransform((current) => ({
      ...current,
      rotation: { ...current.rotation, [axis]: value },
    }));
  };

  const handleSave = () => {
    saveArModelTransform(transform);
    setSavedMessage("Saved! These settings apply in the AR experience too.");
    window.setTimeout(() => setSavedMessage(null), 4000);
  };

  const handleReset = () => {
    setTransform(DEFAULT_AR_MODEL_TRANSFORM);
    saveArModelTransform(DEFAULT_AR_MODEL_TRANSFORM);
    setSavedMessage("Reset to defaults and saved.");
    window.setTimeout(() => setSavedMessage(null), 4000);
  };

  const openCamera = () => {
    setCameraError(null);
    setCameraActive(true);
  };

  const closeCamera = () => {
    setCameraActive(false);
    setCameraStatus("idle");
  };

  return (
    <main
      className={`bg-zinc-950 text-white ${
        cameraActive ? "fixed inset-0 overflow-hidden" : "min-h-screen"
      }`}
    >
      <ArManagePreview
        transform={transform}
        active={cameraActive}
        onStatusChange={handleCameraStatus}
      />

      {/* Top bar */}
      <div
        className={`${
          cameraActive ? "fixed top-0 right-0 left-0 z-30" : "relative"
        } border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur`}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-400">
              AR settings
            </p>
            <h1 className="text-lg font-bold sm:text-xl">
              Model position &amp; size
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {cameraActive ? (
              <button
                type="button"
                onClick={closeCamera}
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
              >
                Close camera
              </button>
            ) : (
              <button
                type="button"
                onClick={openCamera}
                disabled={!scriptsReady || cameraStatus === "loading"}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {!scriptsReady
                  ? "Loading AR…"
                  : cameraStatus === "loading"
                    ? "Opening camera…"
                    : "Open AR camera"}
              </button>
            )}
            <Link
              href="/wheel-of-fortune"
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
            >
              Test in AR
            </Link>
            <Link
              href="/"
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
            >
              Home
            </Link>
          </div>
        </div>
      </div>

      {/* Controls panel */}
      <div
        className={
          cameraActive
            ? "fixed right-0 bottom-0 left-0 z-30 max-h-[55vh] overflow-y-auto rounded-t-2xl border-t border-zinc-700 bg-zinc-950/95 px-4 py-5 backdrop-blur"
            : "mx-auto max-w-5xl px-6 py-8"
        }
      >
        {!cameraActive && (
          <p className="mb-6 max-w-xl text-zinc-400">
            Open the AR camera and point at your marker. Use the sliders to
            adjust size and placement in real time, then save.
          </p>
        )}

        {cameraError && (
          <p className="mb-4 rounded-lg bg-red-950/60 px-4 py-3 text-sm text-red-300">
            {cameraError}
          </p>
        )}

        <div className={`space-y-6 ${cameraActive ? "" : "max-w-xl"}`}>
          <SliderField
            label="Scale"
            value={transform.scale}
            min={0.1}
            max={50}
            step={0.1}
            onChange={updateScale}
          />

          <FieldGroup title="Position">
            <SliderField
              label="X"
              value={transform.position.x}
              min={-5}
              max={5}
              step={0.01}
              onChange={(value) => updatePosition("x", value)}
            />
            <SliderField
              label="Y"
              value={transform.position.y}
              min={-5}
              max={5}
              step={0.01}
              onChange={(value) => updatePosition("y", value)}
            />
            <SliderField
              label="Z"
              value={transform.position.z}
              min={-5}
              max={5}
              step={0.01}
              onChange={(value) => updatePosition("z", value)}
            />
          </FieldGroup>

          <FieldGroup title="Rotation (degrees)">
            <SliderField
              label="X"
              value={transform.rotation.x}
              min={-180}
              max={180}
              step={1}
              onChange={(value) => updateRotation("x", value)}
            />
            <SliderField
              label="Y"
              value={transform.rotation.y}
              min={-180}
              max={180}
              step={1}
              onChange={(value) => updateRotation("y", value)}
            />
            <SliderField
              label="Z"
              value={transform.rotation.z}
              min={-180}
              max={180}
              step={1}
              onChange={(value) => updateRotation("z", value)}
            />
          </FieldGroup>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              Save settings
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-zinc-700 px-6 py-3 text-sm hover:bg-zinc-900"
            >
              Reset to defaults
            </button>
          </div>

          {savedMessage && (
            <p className="rounded-lg bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">
              {savedMessage}
            </p>
          )}

          {!cameraActive && (
            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-300">
                Saved config (JSON)
              </p>
              <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-400">
                {JSON.stringify(transform, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <h3 className="text-sm font-semibold text-zinc-300">{title}</h3>
      {children}
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="font-mono text-zinc-200">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-emerald-500"
      />
    </label>
  );
}
