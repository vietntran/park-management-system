// src/components/reservation/ReservationForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format, isBefore, startOfDay } from "date-fns";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar/Calendar";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import type { ReservationFormData, SelectedUser } from "@/types/reservation";

import { UserSearch } from "./UserSearch";

// Extend the reservation schema with additional validation
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
  const router = useRouter();
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [userReservations, setUserReservations] = useState<Date[]>([]);

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
    loadUserReservations();
  }, []);

  const loadUserReservations = async () => {
    try {
      const response = await fetch("/api/reservations/user");
      if (!response.ok) {
        throw new Error("Failed to load user reservations");
      }
      const data = await response.json();
      setUserReservations(data.reservations.map((d: string) => new Date(d)));
    } catch (err) {
      console.error("Error loading user reservations:", err);
      setError("Failed to load user reservations");
    }
  };

  // Check if a date would create a sequence longer than 3 days
  const wouldExceedConsecutiveDays = (date: Date): boolean => {
    const selectedDates = [...userReservations, date].map((d) =>
      startOfDay(d).getTime(),
    );
    const sortedDates = [...new Set(selectedDates)].sort((a, b) => a - b);

    // Check for consecutive dates
    let consecutiveDays = 1;
    let maxConsecutiveDays = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const diff =
        (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        consecutiveDays++;
        maxConsecutiveDays = Math.max(maxConsecutiveDays, consecutiveDays);
      } else {
        consecutiveDays = 1;
      }
    }

    return maxConsecutiveDays > 3;
  };

  const loadAvailableDates = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const validateUsers = async (users: SelectedUser[]): Promise<boolean> => {
    try {
      const response = await fetch("/api/users/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userIds: users.map((u) => u.id) }),
      });

      if (!response.ok) {
        throw new Error("Failed to validate users");
      }

      const data = await response.json();
      return data.valid;
    } catch (err) {
      console.error("Error validating users:", err);
      setError("Failed to validate users");
      return false;
    }
  };

  const onSubmit = async (data: ReservationFormData) => {
    setError("");
    setLoading(true);

    try {
      // Check if date would exceed consecutive days limit
      if (wouldExceedConsecutiveDays(data.reservationDate)) {
        setError("Cannot reserve more than 3 consecutive days");
        return;
      }

      // Validate all users are registered
      const usersAreValid = await validateUsers(data.additionalUsers);
      if (!usersAreValid) {
        setError("One or more selected users are not registered in the system");
        return;
      }

      // Check availability
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

      // Create reservation
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

      // Handle successful reservation
      router.push("/dashboard?status=success&message=reservation-created");
    } catch (err) {
      console.error("Error creating reservation:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create reservation",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = async (users: SelectedUser[]) => {
    // Validate users before setting
    try {
      const usersAreValid = await validateUsers(users);
      if (!usersAreValid) {
        setError("One or more selected users are not registered in the system");
        return;
      }
      setValue("additionalUsers", users);
      setError(""); // Clear error if successful
    } catch (err) {
      console.error("Error validating users:", err);
      setError("Failed to validate users");
    }
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
                onSelect={(date) => {
                  if (date) {
                    if (wouldExceedConsecutiveDays(date)) {
                      setError("Cannot reserve more than 3 consecutive days");
                      return;
                    }
                    setValue("reservationDate", date);
                    setError(""); // Clear error if successful
                  }
                }}
                disabled={(date) => {
                  if (loading) return true;
                  const today = startOfDay(new Date());
                  const isBeforeToday = isBefore(date, today);
                  const isAvailable = availableDates.some(
                    (availableDate) =>
                      startOfDay(availableDate).toISOString() ===
                      startOfDay(date).toISOString(),
                  );
                  return isBeforeToday || !isAvailable;
                }}
                initialFocus
                className="mx-auto"
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
