"use client";

import { useSearchParams } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the server configuration. Please try again later.";
      case "AccessDenied":
        return "Access denied. You do not have permission to sign in.";
      case "Verification":
        return "The verification link has expired or has already been used.";
      case "OAuthSignin":
      case "OAuthCallback":
      case "OAuthCreateAccount":
      case "EmailCreateAccount":
      case "Callback":
        return "There was a problem signing you in. Please try again.";
      case "OAuthAccountNotLinked":
        return "To confirm your identity, sign in with the same account you used originally.";
      case "EmailSignin":
        return "The e-mail could not be sent. Please try again.";
      case "CredentialsSignin":
        return "Invalid email or password. Please check your credentials and try again.";
      case "SessionRequired":
        return "Please sign in to access this page.";
      case "Default":
      default:
        return "An unexpected error occurred. Please try again.";
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Error</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="error">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{getErrorMessage(error)}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
