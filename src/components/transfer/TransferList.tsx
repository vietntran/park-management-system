import { TransferStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Transfer } from "@/types/reservation";

interface TransferListProps {
  currentUserId: string;
  transfers: Transfer[];
  onAcceptTransfer: (transferId: string) => Promise<void>;
  onDeclineTransfer: (transferId: string) => Promise<void>;
  onCancelTransfer?: (transferId: string) => Promise<void>;
}

const TransferList = ({
  currentUserId,
  transfers,
  onAcceptTransfer,
  onDeclineTransfer,
  onCancelTransfer,
}: TransferListProps) => {
  const groupedTransfers = transfers.reduce(
    (acc, transfer) => {
      const key = transfer.fromUserId === currentUserId ? "sent" : "received";
      if (!acc[key]) acc[key] = [];
      acc[key].push(transfer);
      return acc;
    },
    {} as Record<"sent" | "received", Transfer[]>,
  );

  const renderTransferCard = (
    transfer: Transfer,
    type: "sent" | "received",
  ) => {
    const isPending = transfer.status === TransferStatus.PENDING;
    const expiresIn = formatDistanceToNow(new Date(transfer.expiresAt), {
      addSuffix: true,
    });

    return (
      <Card key={transfer.id} className="mb-4">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">
                {type === "sent" ? "To: " : "From: "}
                {type === "sent"
                  ? transfer.toUser?.name
                  : transfer.fromUser?.name}
              </CardTitle>
              <CardDescription>
                Reservation Date:{" "}
                {new Date(
                  transfer.reservation?.reservationDate ?? "",
                ).toLocaleDateString()}
              </CardDescription>
            </div>
            <Badge variant={isPending ? "outline" : "secondary"}>
              {transfer.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Spots to transfer: {transfer.spotsToTransfer.length}
            </p>
            {transfer.isPrimaryTransfer && (
              <Badge variant="default" className="bg-blue-500">
                Primary Transfer
              </Badge>
            )}
            <p className="text-sm text-gray-500">Expires {expiresIn}</p>
          </div>
        </CardContent>
        {isPending && (
          <CardFooter className="flex justify-end gap-2">
            {type === "received" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => onDeclineTransfer(transfer.id)}
                >
                  Decline
                </Button>
                <Button onClick={() => onAcceptTransfer(transfer.id)}>
                  Accept
                </Button>
              </>
            ) : (
              onCancelTransfer && (
                <Button
                  variant="destructive"
                  onClick={() => onCancelTransfer(transfer.id)}
                >
                  Cancel Transfer
                </Button>
              )
            )}
          </CardFooter>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {groupedTransfers.received?.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Received Transfers</h2>
          <div>
            {groupedTransfers.received.map((transfer) =>
              renderTransferCard(transfer, "received"),
            )}
          </div>
        </section>
      )}

      {groupedTransfers.sent?.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Sent Transfers</h2>
          <div>
            {groupedTransfers.sent.map((transfer) =>
              renderTransferCard(transfer, "sent"),
            )}
          </div>
        </section>
      )}

      {!groupedTransfers.received?.length && !groupedTransfers.sent?.length && (
        <div className="text-center py-8 text-gray-500">
          No pending transfers found
        </div>
      )}
    </div>
  );
};

export default TransferList;
