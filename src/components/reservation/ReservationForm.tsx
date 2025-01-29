// src/components/reservation/ReservationForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar/Calendar";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { handleFormError } from "@/lib/errors/clientErrorHandler";
import { reservationService } from "@/services/reservationService";
import type { ReservationFormData, SelectedUser } from "@/types/reservation";
import {
  isBeforeNextDay,
  isDateDisabled,
  validateConsecutiveDays,
} from "@/utils/reservationValidation";

import { UserSearch } from "./UserSearch";

const reservationSchema = z.object({
  reservationDate: z
    .date({
      required_error: "Please select a date",
    })
    .refine(
      (date) => !isBeforeNextDay(date),
      "Reservations can be made up to 11:59 PM for the following day",
    ),
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
  const [userReservations, setUserReservations] = useState<Date[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(true);
  const [isLoadingUserReservations, setIsLoadingUserReservations] =
    useState(true);
  const [isValidatingUsers, setIsValidatingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors: formErrors, isSubmitting },
  } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      additionalUsers: [],
    },
  });

  const loadUserReservations = useCallback(async (signal?: AbortSignal) => {
    setIsLoadingUserReservations(true);
    try {
      const response = await reservationService.getUserReservations(signal);
      // Only update state if the request wasn't aborted
      if (!signal?.aborted) {
        setUserReservations(response.reservations.map((d) => new Date(d)));
        setError(null);
      }
    } catch (err) {
      // Only set error if request wasn't aborted
      if (!signal?.aborted) {
        setError(handleFormError(err));
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoadingUserReservations(false);
      }
    }
  }, []);

  const loadAvailableDates = useCallback(async () => {
    setIsLoadingDates(true);
    try {
      const startDate = new Date();
      const endDate = addDays(startDate, 30);
      const response = await reservationService.getAvailableDates(
        startDate,
        endDate,
      );
      setAvailableDates(response.availableDates.map((d) => new Date(d)));
      setError(null);
    } catch (err) {
      setError(handleFormError(err));
    } finally {
      setIsLoadingDates(false);
    }
  }, []);

  useEffect(() => {
    loadAvailableDates();
    loadUserReservations();
  }, [loadAvailableDates, loadUserReservations]);

  const validateUsers = async (users: SelectedUser[]): Promise<boolean> => {
    setIsValidatingUsers(true);
    try {
      const response = await reservationService.validateUsers(users);
      setError(null);
      return response.valid;
    } catch (err) {
      setError(handleFormError(err));
      return false;
    } finally {
      setIsValidatingUsers(false);
    }
  };

  const onSubmit = async (data: ReservationFormData) => {
    setError(null);

    try {
      if (!validateConsecutiveDays(userReservations, data.reservationDate)) {
        throw new Error("Cannot reserve more than 3 consecutive days");
      }

      const usersAreValid = await validateUsers(data.additionalUsers);
      if (!usersAreValid) {
        throw new Error(
          "One or more selected users are not registered in the system",
        );
      }

      const availability = await reservationService.checkDateAvailability(
        data.reservationDate,
      );
      if (!availability.isAvailable) {
        throw new Error(availability.reason || "Date is not available");
      }

      const response = await reservationService.createReservation(data);
      if (response.success) {
        router.push("/dashboard?status=success&message=reservation-created");
      } else {
        throw new Error(response.error || "Failed to create reservation");
      }
    } catch (err) {
      setError(handleFormError(err));
    }
  };

  const handleUserSelect = async (users: SelectedUser[]) => {
    setIsValidatingUsers(true);
    try {
      const usersAreValid = await validateUsers(users);
      if (!usersAreValid) {
        throw new Error(
          "One or more selected users are not registered in the system",
        );
      }
      setValue("additionalUsers", users);
      setError(null);
    } catch (err) {
      setError(handleFormError(err));
    } finally {
      setIsValidatingUsers(false);
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
                    if (isBeforeNextDay(date)) {
                      setError(
                        "Reservations can be made up to 11:59 PM for the following day",
                      );
                      return;
                    }

                    if (!validateConsecutiveDays(userReservations, date)) {
                      setError("Cannot reserve more than 3 consecutive days");
                      return;
                    }
                    setValue("reservationDate", date);
                    setError(null);
                  }
                }}
                disabled={(date) =>
                  isDateDisabled(date, availableDates, isLoadingDates)
                }
                initialFocus
                className="mx-auto"
              />
            </div>
            {formErrors.reservationDate && (
              <p className="text-sm text-destructive">
                {formErrors.reservationDate.message}
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
              isLoading={isValidatingUsers}
            />
            {formErrors.additionalUsers && (
              <p className="text-sm text-destructive">
                {formErrors.additionalUsers.message}
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
            disabled={
              isLoadingDates ||
              isLoadingUserReservations ||
              isValidatingUsers ||
              isSubmitting
            }
          >
            {isSubmitting ? "Creating Reservation..." : "Create Reservation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
