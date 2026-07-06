import { MARKER_IMAGE } from "@/lib/mindar-loader";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <section className="mx-auto flex max-w-lg flex-col items-center px-6 py-16 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-emerald-400">
          Web AR
        </p>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Point your camera at the object to see it come alive</h1>
        <p className="mt-4 text-zinc-400">Works in your browser, no app download is required</p>
        <Link 
          href="/view" 
          className="mt-8 inline-flex h-14 w-full max-w-xs items-center justify-center rounded-full bg-emerald-500 text-lg font-semibold text-zinc-950 transition hover:bg-emerald-400">
            Start AR
        </Link>
      </section>

      {/* HOW IT WORKS? */}
      <section className="border-t border-zinc-800 px-6 py-12">
        <div className="mx-auto grid max-w-lg gap-6">
          <Step number="1" title="Tap Start AR" description="Allow camera access when prompted" />
          <Step number="2" title="Aim at the Marker" description="Point the camera of your phone to the specific object" />
          <Step number="3" title="Watch the Animation" description="The 3D animation appears on top of the object" />
        </div>
      </section>

      {/* What to Scan */}
      <section className="px-6 pb-12 text-center">
        <p className="mb-4 text-sm font-medium text-zinc-400">Scan this target</p>
        <div className="mx-auto overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
          <Image
            src={MARKER_IMAGE}
            alt="Wheel of fortune AR marker"
            width={200}
            height={200}
            className="h-40 w-40 object-cover"
          />
        </div>
      </section>

      {/* Compatibility */}
      <section className="border-t border-zinc-800 px-6 py-8 text-center text-sm text-zinc-500">
        <p>Best on iPhone (Safari) and Android (Chrome)</p>
        <p className="mt-1">Use good lighting and hold your phone steadily</p>
      </section>
    </main>
  )
}

function Step({
  number,
  title, 
  description
}: {
  number: string,
  title: string,
  description: string,
}) {
  return (
    <div className="flex gap-4 rounded-xl bg-zinc-900 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
        {number}
      </div>
      <div className="text-left">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-zinc-400">{description}</p>
      </div>
    </div>
  )
}