// src/components/ui/alert/SuccessAlert.tsx
import { CheckCircle } from "lucide-react";
import React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";

interface SuccessAlertProps {
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
}

export const SuccessAlert = ({
  title,
  description,
  onConfirm,
  confirmText = "Continue",
}: SuccessAlertProps) => {
  return (
    <Alert className="bg-emerald-50 border-emerald-200">
      <CheckCircle className="h-4 w-4 text-emerald-500" />
      <AlertTitle className="text-emerald-800">{title}</AlertTitle>
      <AlertDescription className="text-emerald-700">
        {description}
      </AlertDescription>
      <Button
        onClick={onConfirm}
        className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {confirmText}
      </Button>
    </Alert>
  );
};
