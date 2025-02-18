// src/app/transfers/create/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import TransferForm from "@/components/transfer/TransferForm";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import { handleFormError } from "@/lib/errors/clientErrorHandler";
import { transferService } from "@/services/transferService";
import type { Reservation, TransferFormData } from "@/types/reservation";

interface TransferCreatePageProps {
  searchParams: {
    reservationId?: string;
  };
}

export default function TransferCreatePage({
  searchParams,
}: TransferCreatePageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reservation, setReservation] = useState<Reservation | null>(null);

  // Fetch reservation details when component mounts
  useEffect(() => {
    const fetchReservation = async () => {
      if (!searchParams.reservationId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await transferService.getReservationForTransfer(
          searchParams.reservationId,
        );

        if (response.success) {
          setReservation(response.data);
          setError(null);
        } else {
          setError(response.error);
        }
      } catch (err) {
        setError(handleFormError(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservation();
  }, [searchParams.reservationId]);

  // Handle form submission
  const handleSubmit = async (data: TransferFormData) => {
    try {
      const response = await transferService.createTransfer(data);
      if (response.success) {
        router.push("/transfers");
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(handleFormError(err));
    }
  };

  if (!session?.user?.id) {
    return (
      <Alert variant="error">
        <AlertDescription>
          You must be signed in to create transfers
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return <div>Loading reservation details...</div>; // We can enhance this with a proper loading skeleton
  }

  if (!searchParams.reservationId) {
    return (
      <Alert variant="error">
        <AlertDescription>No reservation ID provided</AlertDescription>
      </Alert>
    );
  }

  // If no reservation found after loading
  if (!reservation) {
    return (
      <Alert variant="error">
        <AlertDescription>Reservation not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create Transfer</h1>
        <Button variant="outline" onClick={() => router.push("/transfers")}>
          Back to Transfers
        </Button>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <TransferForm
        reservation={reservation}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/transfers")}
      />
    </div>
  );
}
