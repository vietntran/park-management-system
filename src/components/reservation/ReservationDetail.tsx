"use client";

import { format } from "date-fns";
import { Pencil, Trash2, UserMinus } from "lucide-react";
import { useState } from "react";

import { TransferForm } from "@/components/transfer/TransferForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { transferService } from "@/services/transferService";
import { Reservation, TransferFormData } from "@/types/reservation";

import { CancellationDialog } from "./CancellationDialog";

interface ReservationDetailProps {
  reservation: Reservation;
  currentUserId: string;
}

export function ReservationDetail({
  reservation,
  currentUserId,
}: ReservationDetailProps) {
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);

  const currentUserReservation = reservation.reservationUsers.find(
    (ru) => ru.userId === currentUserId,
  );

  if (!currentUserReservation) {
    return null;
  }

  const handleTransferSubmit = async (data: TransferFormData) => {
    // Call the transfer service to create a transfer
    await transferService.createTransfer(data);

    // Close the form after successful submission
    setShowTransferForm(false);

    // Redirect to reservations page
    window.location.href = "/reservations";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reservation Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold">Date: </span>
                {format(new Date(reservation.reservationDate), "MMMM d, yyyy")}
              </div>
              <Badge
                variant={
                  currentUserReservation.isPrimary ? "default" : "secondary"
                }
              >
                {currentUserReservation.isPrimary ? "Owner" : "Member"}
              </Badge>
            </div>
            <div>
              <span className="font-semibold">Total Spots: </span>
              {reservation.reservationUsers.length}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reserved Users</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {reservation.reservationUsers.map((ru) => (
              <li
                key={ru.userId}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
              >
                <div>
                  <p className="font-medium">{ru?.user?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {ru?.user?.email}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {ru.isPrimary && <Badge className="mr-2">Owner</Badge>}
                  {currentUserReservation.isPrimary &&
                    !ru.isPrimary &&
                    ru.userId !== currentUserId && (
                      <Button variant="ghost" size="icon" title="Remove user">
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-row gap-4">
        {currentUserReservation.isPrimary && reservation.canTransfer && (
          <Button
            variant={showTransferForm ? "default" : "outline"}
            onClick={() => setShowTransferForm(!showTransferForm)}
            className="flex items-center"
            style={{ marginRight: "16px" }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Transfer Ownership
          </Button>
        )}

        <Button
          variant="destructive"
          onClick={() => setShowCancellationDialog(true)}
          className="flex items-center"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Cancel Reservation
        </Button>
      </div>

      <CancellationDialog
        isOpen={showCancellationDialog}
        onClose={() => setShowCancellationDialog(false)}
        reservationId={reservation.id}
        reservationDate={reservation.reservationDate}
        onCancellationComplete={() => {
          // Redirect back to reservations list after successful cancellation
          window.location.href = "/reservations";
        }}
      />

      {showTransferForm && (
        <TransferForm
          reservation={reservation}
          onCancel={() => setShowTransferForm(false)}
          onSubmit={handleTransferSubmit}
        />
      )}
    </div>
  );
}
