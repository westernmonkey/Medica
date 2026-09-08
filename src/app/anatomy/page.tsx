"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AnatomyViewer } from "@/components/anatomy/AnatomyViewer";
import { MODELS, TAGS } from "@/lib/anatomy/models";

function ModelPanel({
  title,
  src,
  tag,
  slug,
}: {
  title: string;
  src: string;
  tag: string;
  slug: string;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#078859]/22 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between border-b border-[#078859]/10 px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#078859]">
            {tag}
          </p>
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        </div>
        <Link
          href={`/anatomy/${slug}`}
          aria-label={`Open ${title} page`}
          className="relative z-10 rounded-lg border border-[#078859]/30 p-2 text-[#078859] hover:bg-[#F7FDFA]"
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      <AnatomyViewer
        src={src}
        lazy
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#F7FDFA]"
      />
    </article>
  );
}

export default function AnatomyPage() {
  const [tag, setTag] = useState("All");
  const visible = useMemo(
    () => (tag === "All" ? MODELS : MODELS.filter((model) => model.tag === tag)),
    [tag],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#F7FDFA] to-white px-6 py-10 md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-[#078859]">
            Medica
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900">
              Anatomy
            </h1>
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <span className="sr-only">Filter by system</span>
              <select
                className="rounded-lg border border-[#078859]/30 bg-white px-3 py-2 text-sm font-medium text-neutral-900"
                value={tag}
                onChange={(event) => setTag(event.target.value)}
              >
                <option value="All">All systems</option>
                {TAGS.map((system) => (
                  <option key={system} value={system}>
                    {system}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 max-w-xl text-neutral-600">
            Rotate models in place. Scroll to load more as they enter view.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((model) => (
            <ModelPanel key={model.src} {...model} />
          ))}
        </section>
      </div>
    </div>
  );
}
