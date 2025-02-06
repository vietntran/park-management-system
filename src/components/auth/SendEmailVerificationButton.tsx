// src/components/auth/ResendVerificationButton.tsx
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuthLoadingStates } from "@/hooks/useAuthLoadingStates";

interface SendEmailVerificationButtonProps {
  className?: string;
}

export function SendEmailVerificationButton({
  className,
}: SendEmailVerificationButtonProps) {
  const {
    loadingStates: { isSendingVerificationEmail },
    errors: { sendingVerificationEmailError },
    setLoading,
    setError,
    clearError,
  } = useAuthLoadingStates();

  const handleSendVerification = async () => {
    setLoading("isSendingVerificationEmail", true);
    clearError("sendingVerificationEmailError");

    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification email");
      }

      toast.success("Verification email sent");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError("sendingVerificationEmailError", message);
      toast.error(message);
    } finally {
      setLoading("isSendingVerificationEmail", false);
    }
  };

  return (
    <div>
      <Button
        variant="outline"
        onClick={handleSendVerification}
        disabled={isSendingVerificationEmail}
        className={className}
      >
        {isSendingVerificationEmail ? "Sending..." : "Send verification email"}
      </Button>
      {sendingVerificationEmailError && (
        <p className="text-sm text-destructive mt-2">
          {sendingVerificationEmailError}
        </p>
      )}
    </div>
  );
}
