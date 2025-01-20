// src/components/auth/SignOutButton.tsx
"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/form/Button";

interface SignOutButtonProps {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  className?: string;
}

export function SignOutButton({
  variant = "ghost",
  className,
}: SignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleSignOut}
      isLoading={isLoading}
      className={className}
      leftIcon={<LogOut className="w-4 h-4" />}
    >
      Sign Out
    </Button>
  );
}
