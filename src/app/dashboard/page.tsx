"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ThreeDViewer from "@/components/ui/ThreeModel";

export default function DashboardPage() {
  const user = useAuthContext();
  const router = useRouter();
  const { signOut } = useAuth();

  useEffect(() => {
    if (user === null) {
      router.push("/signin");
    }
  }, [user, router]);

  if (user === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gray-500" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-start py-10 px-4 bg-gray-50">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome Back 👋
          </h1>
          <p className="text-gray-600">
            Logged in as <span className="font-semibold">{user.email}</span>
          </p>
        </div>
        <ThreeDViewer />
        <button
          onClick={signOut}
          className="mt-10 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 transition-all shadow-sm"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return null;
}
