// src/components/error/ComponentErrorBoundary.tsx
import { XCircle } from "lucide-react";
import React from "react";

import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import { handleClientError } from "@/lib/errors/clientErrorHandler";

interface Props {
  children: React.ReactNode;
  componentName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ComponentErrorBoundary extends React.Component<Props, State> {
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
        componentName: this.props.componentName,
      },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="error" className="my-2">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              This component is currently unavailable.
              {this.state.error?.message && (
                <span className="block text-xs mt-1 opacity-75">
                  Error: {this.state.error.message}
                </span>
              )}
            </span>
            <Button
              onClick={this.handleReset}
              variant="outline"
              size="sm"
              className="ml-4"
            >
              Reset
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
