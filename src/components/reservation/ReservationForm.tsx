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
import { isBeforeNextDay } from "@/lib/validations/reservation";
import { reservationService } from "@/services/reservationService";
import type { ReservationFormData, SelectedUser } from "@/types/reservation";
import { isDateDisabled } from "@/utils/reservationValidation";

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
      }),
    )
    .max(3, "Maximum of 4 total users including yourself"),
});

export const ReservationForm = () => {
  const router = useRouter();
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(true);
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

  const loadAvailableDates = useCallback(async (signal?: AbortSignal) => {
    setIsLoadingDates(true);
    try {
      const startDate = new Date();
      const endDate = addDays(startDate, 30);
      const response = await reservationService.getAvailableDates(
        startDate,
        endDate,
        signal,
      );

      if (!signal?.aborted) {
        if (response.success) {
          setAvailableDates(
            response.data.availableDates.map((date) => new Date(date)),
          );
          setError(null);
        } else {
          throw new Error(response.error);
        }
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError(handleFormError(err));
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoadingDates(false);
      }
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    loadAvailableDates(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [loadAvailableDates]);

  const validateUsers = async (users: SelectedUser[]): Promise<boolean> => {
    setIsValidatingUsers(true);
    try {
      const response = await reservationService.validateUsers(users);
      setError(null);
      if (response.success) {
        return response.data.valid;
      } else {
        throw new Error(response.error);
      }
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
      // Check date availability which includes consecutive days validation
      const availability = await reservationService.checkDateAvailability(
        data.reservationDate,
      );

      if (!availability.success) {
        throw new Error(availability.error);
      }

      if (!availability.data.isAvailable) {
        throw new Error("Date is not available");
      }

      // Only validate if there are additional users
      if (data.additionalUsers.length > 0) {
        const usersAreValid = await validateUsers(data.additionalUsers);
        if (!usersAreValid) {
          throw new Error(
            "One or more selected users are not registered in the system",
          );
        }
      }

      const response = await reservationService.createReservation(data);
      if (response.success) {
        router.push("/dashboard?status=success&message=reservation-created");
      } else {
        throw new Error(response.error);
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
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          aria-label="reservation-form"
        >
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
            disabled={isLoadingDates || isValidatingUsers || isSubmitting}
          >
            {isSubmitting ? "Creating Reservation..." : "Create Reservation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
