"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import type { PublicMatch } from "@/lib/1v1/types";

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
        return <span key={i} dangerouslySetInnerHTML={{ __html: part }} />;
      })}
    </div>
  );
}

export default function DuelMatchPage() {
  const params = useParams<{ code: string }>();
  const code = String(params.code ?? "").toUpperCase();
  const [match, setMatch] = useState<PublicMatch | null>(null);
  const [error, setError] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [takeover, setTakeover] = useState(false);
  const prevOrder = useRef<string[]>([]);

  useEffect(() => {
    setPlayerId(sessionStorage.getItem(`1v1:${code}:playerId`));
  }, [code]);

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

    fetch(`/api/1v1/${code}`)
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok) {
          setError(data.error);
          return;
        }
        setMatch(data.match);
      });

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.hostname}:3002`);

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ type: "watch", code }));
    });

    socket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data) as { match?: PublicMatch };
      if (data.match) {
        setMatch(data.match);
        setError("");
      }
    });

    socket.addEventListener("error", () => {
      setError("WebSocket failed. Create or join a match first so the server starts.");
    });

    return () => {
      socket.close();
    };
  }, [code]);

  async function answer(optionId: string) {
    if (!playerId) {
      return;
    }
    const res = await fetch(`/api/1v1/${code}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "answer", playerId, optionId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setMatch(data.match);
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
        <span>
          {match.players.map((p) => `${p.name} ${p.score}`).join(" · ")}
        </span>
      </div>
      <div className="mb-6 text-xl">
        <BankHtml html={q.text} />
        {q.image ? (
          <img src={q.image} alt="" className="mt-3 max-h-48 max-w-full" />
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        {q.options.map((opt) => (
          <button
            key={opt.id}
            className="border px-4 py-3 text-left disabled:opacity-50"
            disabled={!playerId || already || !me || roundOver}
            onClick={() => answer(opt.id)}
          >
            <BankHtml html={opt.text} />
            {opt.image ? (
              <img src={opt.image} alt="" className="mt-2 max-h-32 max-w-full" />
            ) : null}
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
      {!playerId ? (
        <p className="mt-4 text-red-600">Join from the 1v1 page first.</p>
      ) : null}
      {already && !roundOver ? (
        <p className="mt-4">Waiting for this round to finish.</p>
      ) : null}
    </main>
  );
}
