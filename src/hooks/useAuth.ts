import { auth } from '@/lib/firebase/client';
import {
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/signin');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
      return userCredential;
    } catch (error) {
      console.error('Error signing up: ', error);
      throw error;
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
      return userCredential;
    } catch (error) {
      console.error('Error signing in: ', error);
      throw error;
    }
  };

  // This is the missing function for Google Sign-In
  const handleSignInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      router.push('/dashboard');
      return userCredential;
    } catch (error) {
      console.error('Error signing in with Google: ', error);
      throw error;
    }
  };

  return {
    signOut: handleSignOut,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signInWithGoogle: handleSignInWithGoogle,
  };
};