"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { reservationService } from "@/services/reservationService";

interface RemoveUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId: string;
  userToRemove: {
    id: string;
    name: string;
    email: string;
  };
  onRemovalComplete: () => void;
}

export function RemoveUserDialog({
  isOpen,
  onClose,
  reservationId,
  userToRemove,
  onRemovalComplete,
}: RemoveUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleRemoveUser = async () => {
    setIsLoading(true);
    try {
      const response = await reservationService.removeUserFromReservation(
        reservationId,
        userToRemove.id,
      );

      if (response.success) {
        toast.success("User has been removed from this reservation");
        onRemovalComplete();
      } else {
        toast.error(`Error: ${response.error}`);
      }
    } catch (error) {
      console.error("Error removing user:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove User from Reservation</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove {userToRemove.name} (
            {userToRemove.email}) from this reservation? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleRemoveUser}
            disabled={isLoading}
          >
            {isLoading ? "Removing..." : "Remove User"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
