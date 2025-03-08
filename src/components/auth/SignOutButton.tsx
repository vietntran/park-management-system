// src/components/auth/SignOutButton.tsx
"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

interface SignOutButtonProps extends Omit<ButtonProps, "onClick"> {
  label?: string;
}

export function SignOutButton({
  variant = "ghost",
  className,
  size = "default",
  label = "Logout",
  ...props
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
      disabled={isLoading}
      size={size}
      className={className}
      {...props}
    >
      <LogOut className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
