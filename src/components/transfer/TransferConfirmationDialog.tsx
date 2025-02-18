// src/components/transfer/TransferConfirmationDialog.tsx
import { Loader2 } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import type { TransferFormData } from "@/types/reservation";

interface TransferConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: TransferFormData) => Promise<void>;
  transferData: TransferFormData;
  recipientName: string;
  reservationDate: Date;
  isPrimaryTransfer: boolean;
  spotsCount: number;
}

export function TransferConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  transferData,
  recipientName,
  reservationDate,
  isPrimaryTransfer,
  spotsCount,
}: TransferConfirmationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      onClose();
    }
  };

  const handleConfirmation = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(transferData);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false); // Important: Set isSubmitting to false after setting error
    }
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Transfer</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Are you sure you want to transfer{" "}
                {spotsCount === 1 ? "a spot" : `${spotsCount} spots`} to{" "}
                {recipientName} for {reservationDate.toLocaleDateString()}?
              </p>
              {isPrimaryTransfer && (
                <p className="font-medium text-yellow-600 dark:text-yellow-500">
                  This will transfer primary reservation holder
                  responsibilities.
                </p>
              )}
              <p className="text-muted-foreground">
                The recipient has 24 hours to accept this transfer, or it will
                expire. This transfer must be completed by 5 PM Central Time the
                day before the reservation.
              </p>
              {error && (
                <p className="text-red-600 dark:text-red-500" role="alert">
                  {error}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmation}
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <Loader2
                className="w-4 h-4 mr-2 animate-spin"
                data-testid="loading-spinner"
              />
            )}
            Confirm Transfer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
