"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./button";

export default function Header() {
  const pathname = usePathname();
  const user = useAuthContext();
  const { signOut } = useAuth();

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
          <Link href="/1v1" className="text-sm font-medium">
            1v1
          </Link>
          <Link href="/anatomy-final" className="text-sm font-medium">
            Anatomy
          </Link>
          <Button asChild variant="ghost">
            <Link href="/mednotes">MedNotes</Link>
          </Button>
          {user ? (
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <p className="max-w-48 truncate text-sm text-muted-foreground">{user.email}</p>
              <Button variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 md:gap-6">
              <Button asChild variant="ghost">
                <Link href="/signin">Login</Link>
              </Button>
              <Button asChild className="rounded-lg bg-[#078859] text-white text-sm px-5 py-5">
                <Link href="/signup">Get Started - It's Free</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
