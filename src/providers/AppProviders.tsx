"use client";

import { useState, useEffect } from 'react';
// Update the import path if the file exists at src/contexts/AuthContext
import { AuthContext, UserContextType } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';

// This is a special component that will wrap our entire application.
// The "children" prop is a standard React concept that refers to all the
// components that this provider will contain.
export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  // We use React's "useState" to hold the user's information.
  // It starts as "undefined" because we are in a loading state.
  const [user, setUser] = useState<UserContextType>(undefined);

  // We use React's "useEffect" to run a piece of code once when the component
  // first loads. This is where we will check the user's login status.
  useEffect(() => {
    // onAuthStateChanged is a real-time listener from Firebase.
    // It automatically checks if the user is logged in, logged out, or if that status changes.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // When the check is complete, we update our state with the user's
      // information (it will be the user object or null).
      setUser(user);
    });

    // This is a cleanup function. When the component is removed, we "unsubscribe"
    // from the listener to prevent memory leaks.
    return () => unsubscribe();
  }, []); // The empty array [] means this effect runs only once.

  // The provider component returns the AuthContext.Provider.
  // It wraps the "children" (the rest of our app) and gives them access
  // to the current "user" value.
  return (
    <AuthContext.Provider value={user}>
      {children}
    </AuthContext.Provider>
  );
};