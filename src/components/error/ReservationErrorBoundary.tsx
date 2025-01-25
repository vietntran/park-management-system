// src/components/error/ReservationErrorBoundary.tsx
import { AlertCircle } from "lucide-react";
import React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import { handleClientError } from "@/lib/errors/clientErrorHandler";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ReservationErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    handleClientError(error, {
      path: window.location.pathname,
      additionalInfo: {
        componentStack: info.componentStack,
        feature: "reservations",
      },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="error" className="my-4">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Reservation System Error</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">
              There was a problem with the reservation system.
              {this.state.error?.message && (
                <span className="block text-sm mt-1 opacity-90">
                  Details: {this.state.error.message}
                </span>
              )}
            </p>
            <div className="space-x-4">
              <Button onClick={this.handleRetry} variant="outline" size="sm">
                Try Again
              </Button>
              <Button
                onClick={() => (window.location.href = "/dashboard")}
                variant="ghost"
                size="sm"
              >
                Return to Dashboard
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
