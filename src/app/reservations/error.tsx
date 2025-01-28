"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import { handleClientError } from "@/lib/errors/clientErrorHandler";

export default function ReservationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep your existing error logging
    handleClientError(error, {
      path: window.location.pathname,
      additionalInfo: {
        severity: "error",
        level: "reservation",
        errorDigest: error.digest,
      },
    });
  }, [error]);

  return (
    <div className="container mx-auto py-10">
      <Alert variant="error">
        <AlertTriangle className="h-6 w-6" />
        <AlertTitle>Reservation Error</AlertTitle>
        <AlertDescription>
          <p>
            We encountered an error while{" "}
            {window.location.pathname.includes("/new")
              ? "creating your reservation"
              : "managing your reservation"}
            .
          </p>
          <p className="text-sm mt-2 text-muted-foreground">
            Error: {error.message}
          </p>
          <Button onClick={reset} className="mt-4" variant="outline">
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
