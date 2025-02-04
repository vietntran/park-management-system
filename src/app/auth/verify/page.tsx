// src/app/auth/verify/page.tsx
"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { Alert } from "@/components/ui/Alert";
import { useAuthLoadingStates } from "@/hooks/useAuthLoadingStates";
import logger from "@/lib/logger";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const {
    loadingStates: { isVerifying },
    errors: { verificationError },
    setLoading,
    setError,
    clearErrors,
  } = useAuthLoadingStates();

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError("verificationError", "No verification token found");
        setLoading("isVerifying", false);
        return;
      }

      setLoading("isVerifying", true);
      clearErrors();

      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Verification failed");
        }

        // Redirect to the specified URL (likely profile completion)
        router.push(data.redirectUrl);
      } catch (error) {
        logger.error("Email verification failed", {
          error: error instanceof Error ? error : new Error(String(error)),
        });
        setError(
          "verificationError",
          error instanceof Error ? error.message : "Verification failed",
        );
        setLoading("isVerifying", false);
      }
    };

    verifyEmail();
  }, [token, router, setLoading, setError, clearErrors]);

  if (verificationError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Email Verification Failed
            </h2>
          </div>
          <Alert variant="error">{verificationError}</Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            {isVerifying ? "Verifying Your Email" : "Email Verified"}
          </h2>
          {isVerifying && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">
                Please wait while we verify your email address...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
