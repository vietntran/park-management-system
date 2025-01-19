// src/components/ui/form/TextField.tsx
import { forwardRef } from "react";

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hideLabel?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, hideLabel, className = "", ...props }, ref) => {
    const id = props.id || props.name;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={id}
            className={`block text-sm font-medium text-gray-700 ${
              hideLabel ? "sr-only" : ""
            }`}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          {...props}
          id={id}
          className={`
            relative block w-full rounded-md border-0 py-1.5 px-3 
            text-gray-900 ring-1 ring-inset ring-gray-300 
            placeholder:text-gray-400 
            focus:ring-2 focus:ring-inset focus:ring-blue-600 
            disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 
            sm:text-sm sm:leading-6
            ${error ? "ring-red-500 focus:ring-red-500" : ""}
            ${className}
          `}
        />
        {error && (
          <p className="text-sm text-red-600" id={`${id}-error`}>
            {error}
          </p>
        )}
      </div>
    );
  },
);

TextField.displayName = "TextField";
