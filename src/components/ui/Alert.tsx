import * as React from "react";

import { cn } from "@/lib/utils";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "success" | "error" | "warning" | "info";
}

const alertStyles = {
  success: "bg-green-50 text-green-700",
  error: "bg-red-50 text-red-700",
  warning: "bg-yellow-50 text-yellow-700",
  info: "bg-blue-50 text-blue-700",
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
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

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-2 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
