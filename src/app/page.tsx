import Image from "next/image";
import Link from "next/link";

const MARKER_IMAGE = "/markers/maddy.png";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex max-w-lg flex-col items-center px-6 py-16 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-emerald-400">
          Web AR
        </p>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          Point your camera at the object to see it come alive
        </h1>
        <p className="mt-4 text-zinc-400">
          Works in your browser — no app download required
        </p>
        <Link
          href="/wheel-of-fortune"
          className="mt-8 inline-flex h-14 w-full max-w-xs items-center justify-center rounded-full bg-emerald-500 text-lg font-semibold text-zinc-950 transition hover:bg-emerald-400"
        >
          Wheel of Fortune Demo
        </Link>
        <Link
          href="/manage"
          className="text-sm text-zinc-500 underline"
        >
          Manage model position &amp; size
        </Link>
      </section>

      <section className="border-t border-zinc-800 px-6 py-12">
        <div className="mx-auto grid max-w-lg gap-6">
          <Step
            number="1"
            title="Open the experience"
            description="Tap Start AR when the scanner is ready"
          />
          <Step
            number="2"
            title="Aim at the marker"
            description="Point your phone at the printed target"
          />
          <Step
            number="3"
            title="Watch the animation"
            description="The 3D animation appears on top of the object"
          />
        </div>
      </section>

      <section className="px-6 pb-12 text-center">
        <p className="mb-4 text-sm font-medium text-zinc-400">Scan this target</p>
        <div className="mx-auto w-fit overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
          <Image
            src={MARKER_IMAGE}
            alt="Wheel of fortune AR marker"
            width={300}
            height={180}
            className="h-auto w-64 object-cover"
          />
        </div>
      </section>

      <section className="border-t border-zinc-800 px-6 py-8 text-center text-sm text-zinc-500">
        <p>Best on iPhone (Safari) and Android (Chrome)</p>
        <p className="mt-1">Use good lighting and hold your phone steady</p>
      </section>
    </main>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-xl bg-zinc-900 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-400">
        {number}
      </div>
      <div className="text-left">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-zinc-400">{description}</p>
      </div>
    </div>
  );
}
