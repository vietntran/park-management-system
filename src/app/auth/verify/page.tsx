"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { EmailVerificationPrompt } from "@/components/auth/EmailVerificationPrompt";
import { Alert } from "@/components/ui/Alert";
import { useAuthLoadingStates } from "@/hooks/useAuthLoadingStates";
import logger from "@/lib/logger";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const {
    loadingStates: { isVerifyingEmailToken },
    errors: { verifyingEmailTokenError },
    setLoading,
    setError,
    clearErrors,
  } = useAuthLoadingStates();

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError("verifyingEmailTokenError", "No verification token found");
        setLoading("isVerifyingEmailToken", false);
        return;
      }

      setLoading("isVerifyingEmailToken", true);
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

        router.push(data.redirectUrl);
      } catch (error) {
        logger.error("Email verification failed", {
          error: error instanceof Error ? error : new Error(String(error)),
        });
        setError(
          "verifyingEmailTokenError",
          error instanceof Error ? error.message : "Verification failed",
        );
        setLoading("isVerifyingEmailToken", false);
      }
    };

    // Only verify if we have a token and verification hasn't started
    if (token && !isVerifyingEmailToken) {
      verifyEmail();
    }
  }, [token, router, setLoading, setError, clearErrors, isVerifyingEmailToken]);

  if (verifyingEmailTokenError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Email Verification Failed
            </h2>
          </div>
          <Alert variant="error">{verifyingEmailTokenError}</Alert>
          {/* Add resend option for expired or invalid tokens */}
          {(verifyingEmailTokenError.includes("expired") ||
            verifyingEmailTokenError.includes("invalid")) && (
            <div className="mt-6">
              <EmailVerificationPrompt />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            {isVerifyingEmailToken ? "Verifying Your Email" : "Email Verified"}
          </h2>
          {isVerifyingEmailToken && (
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
