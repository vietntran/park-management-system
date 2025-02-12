"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCallback, useState } from "react"; // Add useCallback import

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/form/Button";
import { FormContainer } from "@/components/ui/form/FormContainer";
import { TextField } from "@/components/ui/form/TextField";
import { typedFetch } from "@/lib/utils";
import { registerSchema } from "@/lib/validations/auth";
import type { RegisterFormData, RegistrationResponse } from "@/types/auth";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setLoading(true);
      setError(null);

      const formElement = e.currentTarget;
      const formData = new FormData(formElement);

      const formValues = {
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        password: formData.get("password"),
      };

      // Validate form data using Zod schema
      const result = registerSchema.safeParse(formValues);

      if (!result.success) {
        setError(result.error.errors[0].message);
        setLoading(false);
        return;
      }

      const registrationData: RegisterFormData = result.data;

      try {
        const response = await typedFetch<RegistrationResponse>(
          "/api/auth/register",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(registrationData),
          },
        );

        if (!response.success) {
          throw new Error(response.error);
        }

        // Sign in the user after successful registration
        const signInResult = await signIn("credentials", {
          redirect: false,
          email: registrationData.email,
          password: registrationData.password,
        });

        if (signInResult?.error) {
          setError(
            "Registration successful but failed to log in. Please try logging in.",
          );
          router.push("/login");
          return;
        }

        router.push(from);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        );
      } finally {
        setLoading(false);
      }
    },
    [router, from],
  ); // Add dependencies

  const handleGoogleSignIn = useCallback(() => {
    signIn("google", { callbackUrl: from });
  }, [from]); // Add dependency

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
