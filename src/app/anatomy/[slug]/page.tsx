import Link from "next/link";
import { notFound } from "next/navigation";
import { AnatomyViewer } from "@/components/anatomy/AnatomyViewer";
import { getModelBySlug } from "@/lib/anatomy/models";

export default async function AnatomyModelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const model = getModelBySlug(slug);
  if (!model) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#F7FDFA] to-white px-6 py-10 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/anatomy" className="text-sm text-[#078859] hover:underline">
          Back to Anatomy
        </Link>
        <p className="mt-6 text-xs font-medium uppercase tracking-wide text-[#078859]">
          {model.tag}
        </p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight text-neutral-900">
          {model.title}
        </h1>
        <div className="mt-8 overflow-hidden rounded-2xl border border-[#078859]/22 bg-white">
          <AnatomyViewer
            src={model.src}
            className="relative h-[70vh] w-full bg-[#F7FDFA]"
          />
        </div>
      </div>
    </div>
  );
}
