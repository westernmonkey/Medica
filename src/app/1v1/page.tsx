"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function DuelHomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
    const res = await fetch("/api/1v1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not create a match. Please try again.");
      return;
    }
    sessionStorage.setItem(`1v1:${data.match.code}:playerId`, data.playerId);
    router.push(`/1v1/${data.match.code}`);
    } catch {
      setError("Could not reach the match service. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const room = code.trim().toUpperCase();
    setBusy(true);
    try {
    const res = await fetch(`/api/1v1/${room}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not join that match. Check the code and try again.");
      return;
    }
    sessionStorage.setItem(`1v1:${data.match.code}:playerId`, data.playerId);
    router.push(`/1v1/${data.match.code}`);
    } catch {
      setError("Could not reach the match service. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-10 p-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#078859]">Medica Beta</p>
      <h1 className="text-3xl font-bold">1v1</h1>
      <p>10 random questions. First correct answer on each question scores 1.</p>
      {error ? <p className="text-red-600">{error}</p> : null}

      <label>
        Your name
        <input
          className="mt-1 w-full border px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          required
        />
      </label>

      <form onSubmit={onCreate} className="flex flex-col gap-3">
        <button disabled={busy} className="bg-[#078859] px-4 py-2 text-white disabled:opacity-60" type="submit">
          {busy ? "Connecting…" : "Create match"}
        </button>
      </form>

      <form onSubmit={onJoin} className="flex flex-col gap-3">
        <label>
          Match code
          <input
            className="mt-1 w-full border px-3 py-2 uppercase"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
            required
          />
        </label>
        <button disabled={busy} className="border px-4 py-2 disabled:opacity-60" type="submit">
          {busy ? "Connecting…" : "Join match"}
        </button>
      </form>
    </main>
  );
}
