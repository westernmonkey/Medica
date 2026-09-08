"use client";

import { AuthContext } from "@/contexts/AuthContext";

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthContext.Provider value={null}>{children}</AuthContext.Provider>
  );
};
