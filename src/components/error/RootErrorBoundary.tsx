// src/components/error/RootErrorBoundary.tsx
import { AlertTriangle } from "lucide-react";
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

export class RootErrorBoundary extends React.Component<Props, State> {
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
        severity: "critical",
        level: "root",
      },
    });
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
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
                <p>Error: {this.state.error?.message || "Unknown error"}</p>
              </div>
              <Button
                onClick={this.handleRefresh}
                className="mt-4"
                variant="outline"
              >
                Refresh Application
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
