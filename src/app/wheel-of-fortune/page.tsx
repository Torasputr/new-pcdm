"use client";

import { useRef } from "react";

export default function WheelOfFortunePage() {
    const videoRef = useRef<HTMLVideoElement>(null);
    return (
        <main className="relative min-h-screen bg-black text-white">
            <video 
                ref={videoRef} playsInline muted
                className={`fixed inset-0 h-full w-full object-cover ${
                    status === "running" ? "block" : "hidden"
                }`}
            />
        </main>
    )
}