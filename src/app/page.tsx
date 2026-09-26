"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Doctor } from "@/components/ui/Doctor";
import MagicBento from "@/components/ui/MagicBento";

export default function Home() {
  return (
    <div className="flex w-full flex-col items-center">
      {/* Hero Section */}
      <section className="flex w-full flex-1 items-center justify-center">
        <div className="container mx-auto grid grid-cols-1 items-center gap-40 p-4 md:grid-cols-2">
          {/* Left Column */}
          <div className="flex flex-col items-center gap-4 text-center md:items-start md:text-left">
            <h1 className="ml-[114px] mt-[110px] font-sans text-4xl font-bold tracking-wide leading-tight md:text-7xl lg:text-6xl">
              <span className="block">Your</span>
              <span className="block rounded-lg bg-[#078859] px-2 py-5 text-white">
                Command Centre
              </span>
              <span className="block">for Med School.</span>
            </h1>

            <p className="ml-[114px] max-w-screen-sm text-lg text-muted-foreground">
              Medica organizes your overwhelming curriculum into a clear, <br />
              intelligent path forward. Stop drowning in notes. Start <br />
              understanding.
            </p>

            <Link href="/anatomy-final" className="ml-[114px] mt-[16px]">
              <Button className="bg-[#078859] text-lg text-white hover:bg-[#067a50] px-8 py-7">
                Explore the Anatomy Atlas
              </Button>
            </Link>
          </div>

          {/* Right Column */}
          <div className="ml-[20px] mt-[70px] hidden md:block">
            <Doctor className="h-auto w-full max-w-lg" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-24">
        <div className="container mx-auto flex flex-col items-center">
          <h2 className="mb-8 text-3xl font-bold">Available in the beta</h2>
          <MagicBento glowColor="7, 136, 89" />
        </div>
      </section>
    </div>
  );
}
