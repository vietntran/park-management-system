"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import { handleClientError } from "@/lib/errors/clientErrorHandler";

export default function ReservationDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    handleClientError(error, {
      path: window.location.pathname,
      additionalInfo: {
        severity: "error",
        level: "reservation-detail",
        errorDigest: error.digest,
      },
    });
  }, [error]);

  return (
    <div className="container mx-auto py-10">
      <Alert variant="error">
        <AlertTriangle className="h-6 w-6" />
        <AlertTitle>Reservation Details Error</AlertTitle>
        <AlertDescription>
          <p>We encountered an error while loading the reservation details.</p>
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
