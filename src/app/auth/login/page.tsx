"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/form/Button";
import { FormContainer } from "@/components/ui/form/FormContainer";
import { TextField } from "@/components/ui/form/TextField";
import { loginSchema } from "@/lib/validations/auth";
import { LoginError, LoginFormData } from "@/types/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";
  const [error, setError] = useState<LoginError>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
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
          onSubmit={handleSubmit(onSubmit)}
          suppressHydrationWarning
        >
          <div className="space-y-4">
            <TextField
              {...register("email")}
              type="email"
              label="Email address"
              autoComplete="email"
              required
              placeholder="Email address"
              error={errors.email?.message}
              suppressHydrationWarning
            />

            <TextField
              {...register("password")}
              type="password"
              label="Password"
              autoComplete="current-password"
              required
              placeholder="Password"
              error={errors.password?.message}
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
