"use client";

import { useEffect, useState } from "react";

export default function MedNotesPage() {
  const [pulse, setPulse] = useState(false);

  useEffect(function onMount() {
    const id = window.setTimeout(function startPulse() {
      setPulse(true);
    }, 120);
    return function cleanup() {
      window.clearTimeout(id);
    };
  }, []);

  function openApp() {
    fetch("/api/mednotes/open", { method: "POST" }).catch(function onOpenError() {
      window.location.href = "mednotes://open";
    });
  }

  return (
    <main className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-[#04150f] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, #0b6e4f 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 85% 70%, #07885955 0%, transparent 50%), radial-gradient(ellipse 40% 30% at 10% 80%, #1a5c4040 0%, transparent 45%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <section className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <p
          className={`mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-[#7dceb0] transition-all duration-700 ${
            pulse ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          Medica Desktop
        </p>

        <h1
          className={`font-serif text-6xl font-semibold tracking-tight text-white sm:text-7xl md:text-8xl transition-all duration-700 delay-100 ${
            pulse ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          MedNotes
        </h1>

        <p
          className={`mt-6 max-w-xl text-lg leading-relaxed text-[#c5e8d8] transition-all duration-700 delay-200 ${
            pulse ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          Offline notes with voice, photos, and meaning search. Stays on your
          machine. No account. No cloud.
        </p>

        <div
          className={`mt-10 flex flex-wrap items-center justify-center gap-4 transition-all duration-700 delay-300 ${
            pulse ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <a
            href="/api/mednotes/download"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-[#078859] px-7 text-sm font-semibold text-white shadow-[0_0_40px_rgba(7,136,89,0.45)] transition hover:bg-[#0a9a66] hover:shadow-[0_0_55px_rgba(7,136,89,0.65)]"
          >
            Download MedNotes
          </a>
          <button
            type="button"
            onClick={openApp}
            className="inline-flex h-12 items-center justify-center rounded-lg border border-[#2f6b54] bg-white/5 px-7 text-sm font-semibold text-[#e8fff5] backdrop-blur transition hover:border-[#078859] hover:bg-white/10"
          >
            Open App
          </button>
        </div>

        <p
          className={`mt-8 text-sm text-[#7dceb0]/80 transition-all duration-700 delay-500 ${
            pulse ? "opacity-100" : "opacity-0"
          }`}
        >
          macOS · local only · semantic search built in
        </p>
      </section>
    </main>
  );
}
