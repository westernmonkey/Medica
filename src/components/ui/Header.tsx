"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "./button";

export default function Header() {
  const pathname = usePathname();
  if (pathname === "/mednotes") return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm bg-[#F7FDFACC]">
      <div className="flex min-h-20 flex-wrap items-center gap-4 px-4 py-4 md:px-8">
        <div className="shrink-0">
          <Link href="/" className="flex items-center">
            <Image
              src="/Medica-logo.png"
              alt="Medica Logo"
              width={115}
              height={35}
            />
          </Link>
        </div>
        <nav aria-label="Main navigation" className="flex w-full flex-wrap items-center gap-3 md:ml-auto md:w-auto md:gap-6">
          <span className="rounded-full border border-[#078859]/30 bg-[#e8f7ef] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#066b47]">Beta</span>
          <Link href="/1v1" className="text-sm font-medium">
            1v1
          </Link>
          <Link href="/dashboard" className="text-sm font-medium">
            Dashboard
          </Link>
          <Link href="/anatomy-final" className="text-sm font-medium">
            Anatomy
          </Link>
          <Button asChild variant="ghost">
            <Link href="/mednotes">MedNotes</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
