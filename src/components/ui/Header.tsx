"use client";

import Link from "next/link";
import Image from "next/image"; 
import { useAuthContext } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./button";

export default function Header() {
  const user = useAuthContext();
  const { signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm bg-[#F7FDFACC]">
      {/* 1. REMOVED `container` and `mx-auto` and ADDED `px-8` to make the content wider */}
      <div className="flex h-20 items-center px-8"> 
        
        {/* Logo Section */}
        {/* 2. MOVED `ml-20` here, ADDED `relative -top-1` to move it up slightly */}
        <div className="ml-18 -top-1">
          <Link href="/" className="flex items-center">
            <Image
              src="/Medica-logo.png"
              alt="Medica Logo"
              width={115} // 3. RESIZED the logo slightly
              height={35} 
            />
          </Link>
        </div>

        {/* Navigation Section */}
        <nav className="ml-auto mr-10">
          {user ? (
            // If user is logged in
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Button variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          ) : (
            // If user is logged out
            <div className="flex items-center gap-6">
              <Button asChild variant="ghost">
                <Link href="/signin">Login</Link>
              </Button>
              {/* 4. FIXED the button classes */}
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