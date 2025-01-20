"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Alert } from "@/components/ui/form/Alert";
import { Button } from "@/components/ui/form/Button";
import { FormContainer } from "@/components/ui/form/FormContainer";
import { TextField } from "@/components/ui/form/TextField";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError("Invalid email or password");
        return;
      }

      router.push(from);
    } catch (error) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: from });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <FormContainer
        title="Sign in to your account"
        subtitle={
          <>
            Or{" "}
            <Link
              href="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              create a new account
            </Link>
          </>
        }
      >
        <form
          className="mt-8 space-y-6"
          onSubmit={handleSubmit}
          suppressHydrationWarning
        >
          <div className="space-y-4">
            <TextField
              name="email"
              type="email"
              label="Email address"
              autoComplete="email"
              required
              hideLabel
              placeholder="Email address"
              suppressHydrationWarning
            />

            <TextField
              name="password"
              type="password"
              label="Password"
              autoComplete="current-password"
              required
              hideLabel
              placeholder="Password"
              suppressHydrationWarning
            />
          </div>

          {error && <Alert variant="error">{error}</Alert>}

          <Button type="submit" isLoading={loading} className="w-full">
            Sign in
          </Button>
        </form>

        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-gray-50 px-2 text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleGoogleSignIn}
          className="w-full"
        >
          Google
        </Button>
      </FormContainer>
    </div>
  );
}
