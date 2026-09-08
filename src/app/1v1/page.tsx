"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function DuelHomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const res = await fetch("/api/1v1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    sessionStorage.setItem(`1v1:${data.match.code}:playerId`, data.playerId);
    router.push(`/1v1/${data.match.code}`);
  }

  async function onJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const room = code.trim().toUpperCase();
    const res = await fetch(`/api/1v1/${room}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    sessionStorage.setItem(`1v1:${data.match.code}:playerId`, data.playerId);
    router.push(`/1v1/${data.match.code}`);
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-10 p-8">
      <h1 className="text-3xl font-bold">1v1</h1>
      <p>10 random questions. First correct answer on each question scores 1.</p>
      {error ? <p className="text-red-600">{error}</p> : null}

      <label>
        Your name
        <input
          className="mt-1 w-full border px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>

      <form onSubmit={onCreate} className="flex flex-col gap-3">
        <button className="bg-[#078859] px-4 py-2 text-white" type="submit">
          Create match
        </button>
      </form>

      <form onSubmit={onJoin} className="flex flex-col gap-3">
        <label>
          Match code
          <input
            className="mt-1 w-full border px-3 py-2 uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </label>
        <button className="border px-4 py-2" type="submit">
          Join match
        </button>
      </form>
    </main>
  );
}
