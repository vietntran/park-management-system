// src/components/reservation/ReservationForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format } from "date-fns";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar/Calendar";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/form/Alert";
import type { ReservationFormData, SelectedUser } from "@/types/reservation";

import { UserSearch } from "./UserSearch";

const reservationSchema = z.object({
  reservationDate: z
    .date({
      required_error: "Please select a date",
    })
    .min(new Date(), "Reservation must be for a future date"),
  additionalUsers: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
        canModify: z.boolean(),
        canTransfer: z.boolean(),
      }),
    )
    .max(3, "Maximum of 4 total users including yourself"),
});

export const ReservationForm = () => {
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      additionalUsers: [],
    },
  });

  useEffect(() => {
    loadAvailableDates();
  }, []);

  const loadAvailableDates = async () => {
    try {
      const startDate = new Date();
      const endDate = addDays(startDate, 30);
      const response = await fetch(
        `/api/reservations/availability?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load available dates");
      }

      const data = await response.json();
      setAvailableDates(data.availableDates.map((d: string) => new Date(d)));
    } catch (err) {
      console.error("Error loading available dates:", err);
      setError("Failed to load available dates");
    }
  };

  const onSubmit = async (data: ReservationFormData) => {
    setLoading(true);
    setError("");

    try {
      const availabilityResponse = await fetch(
        `/api/reservations/check-availability?date=${data.reservationDate.toISOString()}`,
      );

      if (!availabilityResponse.ok) {
        throw new Error("Failed to check availability");
      }

      const availability = await availabilityResponse.json();
      if (!availability.isAvailable) {
        setError(availability.reason || "Date is not available");
        return;
      }

      const response = await fetch("/api/reservations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create reservation");
      }

      // Handle successful reservation (e.g., redirect to confirmation page)
      // const reservation = await response.json();
      // router.push(`/reservations/${reservation.id}`);
    } catch (err) {
      console.error("Error creating reservation:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create reservation",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: SelectedUser) => {
    const currentUsers = watch("additionalUsers") || [];
    setValue("additionalUsers", [...currentUsers, user]);
  };

  const selectedDate = watch("reservationDate");

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center">Make a Reservation</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Select Date</h3>
              {selectedDate && (
                <p className="text-sm text-muted-foreground">
                  Selected: {format(selectedDate, "PP")}
                </p>
              )}
            </div>
            <div className="border rounded-lg p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setValue("reservationDate", date)}
                disabled={(date) => {
                  if (date < new Date()) return true;
                  return !availableDates.some(
                    (availableDate) =>
                      availableDate.toDateString() === date.toDateString(),
                  );
                }}
                initialFocus
                className="mx-auto"
                footer={
                  selectedDate && (
                    <p className="mt-4 text-sm text-center">
                      You can have up to 3 additional users for this reservation
                    </p>
                  )
                }
              />
            </div>
            {errors.reservationDate && (
              <p className="text-sm text-destructive">
                {errors.reservationDate.message}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Add Additional Users</h3>
              <p className="text-sm text-muted-foreground">
                {watch("additionalUsers").length}/3 Additional Users
              </p>
            </div>
            <UserSearch
              onUserSelect={handleUserSelect}
              selectedUsers={watch("additionalUsers") || []}
              maxUsers={3}
            />
            {errors.additionalUsers && (
              <p className="text-sm text-destructive">
                {errors.additionalUsers.message}
              </p>
            )}
          </div>

          {error && (
            <Alert variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || isSubmitting}
          >
            {loading || isSubmitting
              ? "Creating Reservation..."
              : "Create Reservation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
