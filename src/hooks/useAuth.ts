import { useRouter } from "next/navigation";

// Placeholder until Supabase auth is wired up.
// Sign-in / sign-up pages and Header still call these methods.
export const useAuth = () => {
  const router = useRouter();

  return {
    signOut: async () => {
      router.push("/signin");
    },
    signUp: async (_email: string, _password: string) => {
      return undefined;
    },
    signIn: async (_email: string, _password: string) => {
      return undefined;
    },
    signInWithGoogle: async () => {
      return undefined;
    },
  };
};
