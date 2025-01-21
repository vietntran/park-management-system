// src/components/ui/LoadingSpinner.tsx
import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

export const LoadingSpinner = React.forwardRef<
  HTMLDivElement,
  LoadingSpinnerProps
>(({ size = "md", className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex justify-center items-center p-4", className)}
      {...props}
    >
      <Skeleton className={cn("rounded-full", sizeClasses[size])} />
    </div>
  );
});

LoadingSpinner.displayName = "LoadingSpinner";
