// src/components/ui/form/Alert.tsx
import * as React from "react";

import { cn } from "@/lib/utils";

interface AlertProps {
  variant?: "success" | "error" | "warning" | "info";
  className?: string;
  children: React.ReactNode;
}

const alertStyles = {
  success: "bg-green-50 text-green-700",
  error: "bg-red-50 text-red-700",
  warning: "bg-yellow-50 text-yellow-700",
  info: "bg-blue-50 text-blue-700",
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = "info", className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(`rounded-md p-4 ${alertStyles[variant]}`, className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Alert.displayName = "Alert";

interface AlertDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  AlertDescriptionProps
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    >
      {children}
    </div>
  );
});
AlertDescription.displayName = "AlertDescription";
