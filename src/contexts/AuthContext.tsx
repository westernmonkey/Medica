// This command tells Next.js that this is a client-side component
"use client";

import { createContext, useContext } from 'react';
import { User } from 'firebase/auth';

// First, we define what the "user" data will look like.
// It can either be a Firebase User object, null (if logged out), or undefined (while loading).
export type UserContextType = User | null | undefined;

// We create the actual "context" here.
// Think of this as the blueprint for our global state.
export const AuthContext = createContext<UserContextType>(undefined);

// Finally, we create a simple "hook" that other components can use to easily access the context.
// This is a shortcut so we don't have to type "useContext(AuthContext)" every time.
export const useAuthContext = () => useContext(AuthContext);