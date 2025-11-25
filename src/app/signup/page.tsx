"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function SignUpPage() {
  // 1. Get the new signInWithGoogle function from the hook
  const { signUp, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      await signUp(email, password);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already in use.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. This is a new handler specifically for the Google button
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      setError("Failed to sign in with Google. Please try again.");
      console.error(error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Image src="/Medica-logo.png" alt="Medica Logo" width={200} height={50} className="mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold ">Create an Account</CardTitle>
          <CardDescription>Enter your details to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            {/* ... your existing email/password/confirm password inputs ... */}
            <div className="grid gap-2">  
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="name@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="relative grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-8">
                {showPassword ? <EyeOff className="h-5 w-5 text-gray-500" /> : <Eye className="h-5 w-5 text-gray-500" />}
              </button>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="bg-[#078859] text-white w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin " /> : "Create Account"}
            </Button>
          </form>

          {/* 3. ADD THIS SECTION for the divider and Google button */}
          <div className="my-4 flex items-center">
            <div className="flex-grow border-t"></div>
            <span className="mx-4 flex-shrink text-xs uppercase text-muted-foreground">Or</span>
            <div className="flex-grow border-t"></div>
          </div>
          <Button variant="outline" className="w-full flex items-center gap-2" onClick={handleGoogleSignIn}>
            <Image src="/Google logo.png" alt="Google logo" width={20} height={20} />
            Continue with Google
          </Button>

        </CardContent>
        <CardFooter className="text-sm justify-center">
          Already have an account? 
          <Link href="/signin" className="ml-1 font-semibold text-primary hover:underline">
            Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}