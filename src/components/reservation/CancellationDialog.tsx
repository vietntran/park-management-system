import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

interface CancellationDialogProps {
  isOpen: boolean;
  reservationId: string;
  reservationDate: Date;
  onClose: () => void;
  onCancellationComplete: () => void;
}

export function CancellationDialog({
  isOpen,
  reservationId,
  reservationDate,
  onClose,
  onCancellationComplete,
}: CancellationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCancellation = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/reservations/${reservationId}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to cancel reservation");
      }

      toast.success("Your reservation has been successfully cancelled.");

      onCancellationComplete();
    } catch (error) {
      toast.error("Failed to cancel reservation. Please try again.");
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Reservation</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel your reservation for{" "}
            {reservationDate.toLocaleDateString()}? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex justify-end gap-0">
          <AlertDialogAction
            onClick={handleCancellation}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600 mr-4"
            disabled={isLoading}
            style={{ marginRight: "16px" }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Confirm Cancellation
          </AlertDialogAction>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
