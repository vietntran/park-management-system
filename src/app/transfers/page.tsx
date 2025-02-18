// src/app/transfers/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import TransferList from "@/components/transfer/TransferList";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import { transferService } from "@/services/transferService";
import type { Transfer } from "@/types/reservation";

export default function TransfersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch transfers using the established service
  const fetchTransfers = async () => {
    try {
      const response = await transferService.getPendingTransfers();
      if (response.success) {
        setTransfers(response.data);
        setError(null);
      } else {
        setError(response.error);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    }
  };

  // Handle accept transfer action
  const handleAcceptTransfer = async (transferId: string) => {
    try {
      const response = await transferService.respondToTransfer(
        transferId,
        "accept",
      );
      if (response.success) {
        await fetchTransfers(); // Refresh the list after accepting
        setError(null);
      } else {
        setError(response.error);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to accept transfer");
      }
    }
  };

  // Handle decline transfer action
  const handleDeclineTransfer = async (transferId: string) => {
    try {
      const response = await transferService.respondToTransfer(
        transferId,
        "decline",
      );
      if (response.success) {
        await fetchTransfers(); // Refresh the list after declining
        setError(null);
      } else {
        setError(response.error);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to decline transfer");
      }
    }
  };

  // Load transfers when component mounts
  useEffect(() => {
    fetchTransfers();
  }, []);

  if (!session?.user?.id) {
    return (
      <Alert variant="error">
        <AlertDescription>
          You must be signed in to view transfers
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reservation Transfers</h1>
        <Button onClick={() => router.push("/transfers/create")}>
          Create Transfer
        </Button>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <TransferList
        currentUserId={session.user.id}
        transfers={transfers}
        onAcceptTransfer={handleAcceptTransfer}
        onDeclineTransfer={handleDeclineTransfer}
      />
    </div>
  );
}
