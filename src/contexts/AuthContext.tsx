"use client";

import { createContext, useContext } from "react";

// Placeholder user shape until Supabase auth replaces Firebase.
export type UserContextType = { email: string | null } | null | undefined;

export const AuthContext = createContext<UserContextType>(undefined);

export const useAuthContext = () => useContext(AuthContext);
