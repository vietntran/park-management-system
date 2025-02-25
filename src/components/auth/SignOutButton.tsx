// src/components/auth/SignOutButton.tsx
"use client";

import { type VariantProps } from "class-variance-authority";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

import { Button as UIButton } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Button as FormButton } from "@/components/ui/form/Button";

// Define types for the form button
type FormButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type FormButtonSize = "sm" | "md" | "lg";

// Extract variant and size types from the UI button
type UIButtonVariant = VariantProps<typeof buttonVariants>["variant"];
type UIButtonSize = VariantProps<typeof buttonVariants>["size"];

interface SignOutButtonProps {
  variant?: string;
  className?: string;
  size?: string;
  label?: string;
  useNewButton?: boolean; // Flag to determine which button component to use
}

export function SignOutButton({
  variant = "ghost",
  className = "",
  size = "default",
  label = "Logout",
  useNewButton = true, // Default to the new ui/button component
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

  // Convert size to match the format expected by the form button
  const getFormButtonSize = (size: string): FormButtonSize => {
    if (size === "default") return "md";
    if (size === "icon") return "sm";
    if (size === "lg") return "lg";
    return "sm";
  };

  // Convert variant to match the format expected by the form button
  const getFormButtonVariant = (variant: string): FormButtonVariant => {
    if (variant === "destructive") return "primary";
    if (variant === "default") return "primary";
    if (variant === "link") return "ghost";
    if (
      variant === "secondary" ||
      variant === "outline" ||
      variant === "ghost"
    ) {
      return variant as FormButtonVariant;
    }
    return "primary";
  };

  // Use the new UI Button component
  if (useNewButton) {
    // Map to UI button variant
    const uiVariant: UIButtonVariant =
      variant === "primary"
        ? "default"
        : (variant as
            | "default"
            | "destructive"
            | "outline"
            | "secondary"
            | "ghost"
            | "link"
            | null);

    // Map to UI button size
    const uiSize: UIButtonSize = size as
      | "default"
      | "sm"
      | "lg"
      | "icon"
      | null;

    return (
      <UIButton
        variant={uiVariant}
        onClick={handleSignOut}
        disabled={isLoading}
        size={uiSize}
        className={className}
      >
        <LogOut className="h-4 w-4 mr-2" />
        {label}
      </UIButton>
    );
  }

  // Use the form Button component
  return (
    <FormButton
      variant={getFormButtonVariant(variant)}
      onClick={handleSignOut}
      isLoading={isLoading}
      size={getFormButtonSize(size)}
      className={className}
      leftIcon={<LogOut className="w-4 h-4" />}
    >
      {label}
    </FormButton>
  );
}
