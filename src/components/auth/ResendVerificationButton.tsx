// src/components/auth/ResendVerificationButton.tsx
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuthLoadingStates } from "@/hooks/useAuthLoadingStates";

interface ResendVerificationButtonProps {
  className?: string;
}

export function ResendVerificationButton({
  className,
}: ResendVerificationButtonProps) {
  const {
    loadingStates: { isResendingVerification },
    errors: { resendError },
    setLoading,
    setError,
    clearError,
  } = useAuthLoadingStates();

  const handleResendVerification = async () => {
    setLoading("isResendingVerification", true);
    clearError("resendError");

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend verification email");
      }

      toast.success("Verification email sent successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError("resendError", message);
      toast.error(message);
    } finally {
      setLoading("isResendingVerification", false);
    }
  };

  return (
    <div>
      <Button
        variant="outline"
        onClick={handleResendVerification}
        disabled={isResendingVerification}
        className={className}
      >
        {isResendingVerification ? "Sending..." : "Resend verification email"}
      </Button>
      {resendError && (
        <p className="text-sm text-destructive mt-2">{resendError}</p>
      )}
    </div>
  );
}
