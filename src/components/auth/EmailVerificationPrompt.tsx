// src/components/auth/EmailVerificationPrompt.tsx
import { ResendVerificationButton } from "@/components/auth/SendEmailVerificationButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";

interface EmailVerificationPromptProps {
  email?: string;
  className?: string;
}

export function EmailVerificationPrompt({
  email,
  className,
}: EmailVerificationPromptProps) {
  return (
    <Alert variant="warning" className={className}>
      <AlertTitle>Verify your email</AlertTitle>
      <AlertDescription className="space-y-4">
        <p>
          Please verify your email address{email ? ` (${email})` : ""} to access
          all features. Check your inbox for the verification link.
        </p>
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Haven&apos;t received the email? Check your spam folder or click
            below to resend.
          </p>
          <ResendVerificationButton />
        </div>
      </AlertDescription>
    </Alert>
  );
}
