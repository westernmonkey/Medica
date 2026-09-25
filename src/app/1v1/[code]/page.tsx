"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import type { PublicMatch } from "@/lib/1v1/types";
import { SafeHtml, SafeImage } from "@/components/SafeHtml";

function BankHtml({ html }: { html: string | null }) {
  if (!html) {
    return null;
  }
  const parts = html.split(
    /(\$\$[\s\S]+?\$\$)|(\$[^$]+\$)|(\\\[[\s\S]+?\\\])|(\\\([\s\S]+?\\\))/g,
  );
  return (
    <div className="[&_img]:my-2 [&_img]:max-h-48 [&_img]:max-w-full">
      {parts.map((part, i) => {
        if (!part) {
          return null;
        }
        if (part.startsWith("$$") && part.endsWith("$$")) {
          return <BlockMath key={i}>{part.slice(2, -2)}</BlockMath>;
        }
        if (part.startsWith("\\[") && part.endsWith("\\]")) {
          return <BlockMath key={i}>{part.slice(2, -2)}</BlockMath>;
        }
        if (part.startsWith("\\(") && part.endsWith("\\)")) {
          return <InlineMath key={i}>{part.slice(2, -2)}</InlineMath>;
        }
        if (part.startsWith("$") && part.endsWith("$")) {
          return <InlineMath key={i}>{part.slice(1, -1)}</InlineMath>;
        }
        return <SafeHtml key={i} html={part} />;
      })}
    </div>
  );
}

const subscribeToSessionStorage = () => () => {};

export default function DuelMatchPage() {
  const params = useParams<{ code: string }>();
  const code = String(params.code ?? "").toUpperCase();
  const [match, setMatch] = useState<PublicMatch | null>(null);
  const [error, setError] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [answering, setAnswering] = useState(false);
  const [connection, setConnection] = useState("Connecting…");
  const playerId = useSyncExternalStore(
    subscribeToSessionStorage,
    () => window.sessionStorage.getItem(`1v1:${code}:playerId`),
    () => null,
  );
  const [takeover, setTakeover] = useState(false);
  const prevOrder = useRef<string[]>([]);

  useEffect(() => {
    if (!match || !playerId) {
      return;
    }
    const order = [...match.players]
      .sort((a, b) => b.score - a.score)
      .map((p) => p.id);
    const prevIdx = prevOrder.current.indexOf(playerId);
    const nextIdx = order.indexOf(playerId);
    if (prevIdx > 0 && nextIdx === 0) {
      setTakeover(true);
      const t = window.setTimeout(() => setTakeover(false), 1600);
      prevOrder.current = order;
      return () => window.clearTimeout(t);
    }
    prevOrder.current = order;
  }, [match, playerId]);

  useEffect(() => {
    if (!code) {
      return;
    }

    let stopped = false;
    let socket: WebSocket | null = null;
    let retryTimer = 0;
    let retryDelay = 500;

    const loadSnapshot = async () => {
      try {
        const response = await fetch(`/api/1v1/${code}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load this match.");
        setMatch((current) => !current || data.match.revision >= current.revision ? data.match : current);
        setError("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not load this match.");
      }
    };

    void loadSnapshot();

    const connect = () => {
      if (stopped) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${protocol}//${window.location.host}/api/1v1/ws?code=${encodeURIComponent(code)}`);
      socket.addEventListener("open", () => {
        retryDelay = 500;
        setConnection("Live");
      });
      socket.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(String(event.data)) as { match?: PublicMatch; error?: string };
          if (data.error) setError(data.error);
          if (data.match) {
            setMatch((current) => !current || data.match!.revision >= current.revision ? data.match! : current);
            setError("");
            setAnswerError("");
          }
        } catch {
          setConnection("Reconnecting…");
        }
      });
      socket.addEventListener("close", () => {
        if (stopped) return;
        setConnection("Reconnecting…");
        retryTimer = window.setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 10000);
      });
      socket.addEventListener("error", () => socket?.close());
    };

    connect();
    return () => {
      stopped = true;
      window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [code]);

  const matchRevision = match?.revision ?? null;
  const correctOptionId = match?.correctOptionId ?? null;
  useEffect(() => {
    if (matchRevision === null || correctOptionId === null) return;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/1v1/${code}`);
        const data = await response.json();
        if (response.ok) setMatch((current) => data.match.revision >= (current?.revision ?? -1) ? data.match : current);
      } catch {
        setConnection("Reconnecting…");
      }
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [code, matchRevision, correctOptionId]);

  async function answer(optionId: string) {
    if (!playerId) {
      return;
    }
    setAnswering(true);
    setAnswerError("");
    try {
      const res = await fetch(`/api/1v1/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "answer", playerId, optionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnswerError(data.error ?? "That answer could not be submitted.");
        if (res.status === 409) {
          const snapshot = await fetch(`/api/1v1/${code}`);
          const current = await snapshot.json();
          if (snapshot.ok) setMatch((previous) => current.match.revision >= (previous?.revision ?? -1) ? current.match : previous);
        }
        return;
      }
      setMatch(data.match);
    } catch {
      setAnswerError("Could not submit your answer. Check your connection and retry.");
    } finally {
      setAnswering(false);
    }
  }

  if (error) {
    return <main className="p-8 text-red-600">{error}</main>;
  }
  if (!match) {
    return <main className="p-8">Loading…</main>;
  }

  const me = match.players.find((p) => p.id === playerId);
  const already = playerId ? Boolean(match.answers[playerId]) : false;
  const roundOver = match.correctOptionId !== null;
  const board = [...match.players].sort((a, b) => b.score - a.score);

  if (match.status === "waiting") {
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-3xl font-bold">Code {match.code}</h1>
        <p className="mt-4">Waiting for player 2. Share this code.</p>
        <ul className="mt-4 list-disc pl-6">
          {match.players.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
      </main>
    );
  }

  if (match.status === "done") {
    const top = [...match.players].sort((a, b) => b.score - a.score);
    const winner = top[0];
    const tie = top[1] && top[0].score === top[1].score;
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="text-3xl font-bold">Done</h1>
        <p className="mt-4">{tie ? "Tie." : `${winner.name} wins.`}</p>
        <ul className="mt-4">
          {match.players.map((p) => (
            <li key={p.id}>
              {p.name}: {p.score}
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const q = match.question;
  if (!q) {
    return <main className="p-8">No questions loaded.</main>;
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex justify-between">
        <span>
          Q {match.currentIndex + 1} / {match.total}
        </span>
        <span aria-live="polite" className="text-sm text-muted-foreground">{connection}</span>
        <span>
          {match.players.map((p) => `${p.name} ${p.score}`).join(" · ")}
        </span>
      </div>
      <div className="mb-6 text-xl">
        <BankHtml html={q.text} />
        <SafeImage src={q.image} className="mt-3 max-h-48 max-w-full" />
      </div>
      <div className="flex flex-col gap-3">
        {q.options.map((opt) => (
          <button
            key={opt.id}
            className="border px-4 py-3 text-left disabled:opacity-50"
            disabled={!playerId || already || !me || roundOver || answering}
            onClick={() => answer(opt.id)}
          >
            <BankHtml html={opt.text} />
            <SafeImage src={opt.image} className="mt-2 max-h-32 max-w-full" />
          </button>
        ))}
      </div>
      {roundOver ? (
        <div className="mt-8">
          {takeover ? (
            <p className="mb-3 text-lg font-bold text-[#078859]">Takeover</p>
          ) : null}
          <h2 className="text-lg font-semibold">Leaderboard</h2>
          <ol className="mt-3 flex flex-col gap-2">
            {board.map((p, i) => (
              <li
                key={p.id}
                className={`flex justify-between border px-3 py-2 transition-transform duration-500 ${
                  takeover && p.id === playerId
                    ? "-translate-y-2 bg-[#078859] text-white"
                    : ""
                }`}
              >
                <span>
                  {i + 1}. {p.name}
                </span>
                <span>{p.score}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {answerError ? <p role="status" className="mt-4 text-amber-700">{answerError}</p> : null}
      {!playerId ? (
        <p className="mt-4 text-red-600">Join from the 1v1 page first.</p>
      ) : null}
      {already && !roundOver ? (
        <p className="mt-4">Waiting for this round to finish.</p>
      ) : null}
    </main>
  );
}
