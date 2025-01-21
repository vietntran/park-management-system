// src/app/register/page.tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/form/Button";
import { FormContainer } from "@/components/ui/form/FormContainer";
import { TextField } from "@/components/ui/form/TextField";

export default function RegisterPage() {
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
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const password = formData.get("password") as string;

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to register");
      }

      // Sign in the user after successful registration
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError(
          "Registration successful but failed to log in. Please try logging in.",
        );
        router.push("/login");
        return;
      }

      router.push(from);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
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
        title="Create your account"
        subtitle={
          <>
            Or{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              sign in to your account
            </Link>
          </>
        }
      >
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <TextField
              name="name"
              type="text"
              label="Full Name"
              required
              autoComplete="name"
              placeholder="Enter your full name"
            />

            <TextField
              name="email"
              type="email"
              label="Email address"
              required
              autoComplete="email"
              placeholder="Enter your email address"
            />

            <TextField
              name="phone"
              type="tel"
              label="Phone Number"
              required
              autoComplete="tel"
              placeholder="Enter your phone number"
            />

            <TextField
              name="password"
              type="password"
              label="Password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Create a password (minimum 8 characters)"
            />
          </div>

          {error && <Alert variant="error">{error}</Alert>}

          <Button type="submit" isLoading={loading} className="w-full">
            {loading ? "Creating account..." : "Create account"}
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
