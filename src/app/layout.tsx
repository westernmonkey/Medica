import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import React from "react";
import Header from "@/components/ui/Header";

// 👇 Add this at the top level — this file must be a module.
export {}; // ensures TypeScript treats this file as a module for global declarations

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Medica Beta",
  description: "Medica — tools for medical students, in beta.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <body className="antialiased flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1 w-full">{children}</main>
      </body>
    </html>
  );
}
