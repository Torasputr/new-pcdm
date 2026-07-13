"use client";

import ModelPreview from "@/components/ModelPreview";
import {
  DEFAULT_AR_MODEL_TRANSFORM,
  loadArModelTransform,
  saveArModelTransform,
  type ArModelTransform,
} from "@/lib/ar-model-config";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type Axis = "x" | "y" | "z";

export default function ManagePage() {
  const [transform, setTransform] = useState<ArModelTransform>(
    DEFAULT_AR_MODEL_TRANSFORM,
  );
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setTransform(loadArModelTransform());
  }, []);

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
    setSavedMessage("Saved! Open the AR experience to test on your marker.");
    window.setTimeout(() => setSavedMessage(null), 4000);
  };

  const handleReset = () => {
    setTransform(DEFAULT_AR_MODEL_TRANSFORM);
    saveArModelTransform(DEFAULT_AR_MODEL_TRANSFORM);
    setSavedMessage("Reset to defaults and saved.");
    window.setTimeout(() => setSavedMessage(null), 4000);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
              AR settings
            </p>
            <h1 className="mt-1 text-3xl font-bold">Model position &amp; size</h1>
            <p className="mt-2 max-w-xl text-zinc-400">
              Tune how the 3D model sits on the marker. Save here, then test in
              the AR scanner on the same browser.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/wheel-of-fortune"
              className="rounded-full border border-zinc-700 px-5 py-2.5 text-sm hover:bg-zinc-900"
            >
              Test in AR
            </Link>
            <Link
              href="/"
              className="rounded-full border border-zinc-700 px-5 py-2.5 text-sm hover:bg-zinc-900"
            >
              Home
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-zinc-300">Preview</h2>
            <ModelPreview transform={transform} />
            <p className="mt-3 text-xs text-zinc-500">
              Desktop preview only — final placement should be checked on your
              phone in AR.
            </p>
          </section>

          <section className="space-y-6">
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

            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-300">
                Saved config (JSON)
              </p>
              <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-400">
                {JSON.stringify(transform, null, 2)}
              </pre>
            </div>
          </section>
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
