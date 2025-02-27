"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Checkbox component with forcefully applied sizing
 *
 * This implementation uses !important flags and explicit styling
 * to ensure the checkbox appears at the correct size in all states.
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <div
    className="relative inline-flex shrink-0"
    style={{
      width: "20px",
      height: "20px",
      minWidth: "20px",
      minHeight: "20px",
    }}
  >
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        // Base styles with !important to override any other styles
        "absolute inset-0 rounded-md",

        // Border and background with inline styles
        "border-2 border-gray-400 bg-white",

        // State styling that won't affect dimensions
        "data-[state=checked]:bg-primary data-[state=checked]:border-primary",

        // Interactive states
        "hover:border-gray-500",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",

        // Cursor
        "cursor-pointer",

        className,
      )}
      style={{
        width: "20px",
        height: "20px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className="flex items-center justify-center text-primary-foreground"
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <Check
          className="text-current"
          style={{
            width: "14px",
            height: "14px",
          }}
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  </div>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
