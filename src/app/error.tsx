"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import { handleClientError } from "@/lib/errors/clientErrorHandler";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Preserve the existing error logging functionality
    handleClientError(error, {
      path: window.location.pathname,
      additionalInfo: {
        severity: "critical",
        level: "root",
        errorDigest: error.digest,
      },
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Alert variant="error" className="max-w-xl">
        <AlertTriangle className="h-6 w-6" />
        <AlertTitle className="text-xl">Application Error</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="text-lg mb-4">
            We apologize, but something went wrong with the application.
          </p>
          <div className="space-y-2 text-sm opacity-90">
            <p>Error: {error?.message || "Unknown error"}</p>
          </div>
          <Button onClick={reset} className="mt-4" variant="outline">
            Refresh Application
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
