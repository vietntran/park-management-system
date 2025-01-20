// src/components/dashboard/ReservationsList.tsx
"use client";

import { format } from "date-fns";
import { Users, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

import { useUserStatus } from "@/providers/UserStatusProvider";

interface ReservationDisplay {
  id: string;
  startDate: Date;
  guestCount: number;
}

export function ReservationsList() {
  const { upcomingReservations, isLoading } = useUserStatus();
  const [displayReservations, setDisplayReservations] = useState<
    ReservationDisplay[]
  >([]);

  useEffect(() => {
    // Transform API response to display format
    const transformedReservations = upcomingReservations.map((reservation) => ({
      id: reservation.id,
      startDate: new Date(reservation.startDate),
      guestCount: reservation.guestCount,
    }));
    setDisplayReservations(transformedReservations);
  }, [upcomingReservations]);

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (displayReservations.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p>No upcoming reservations</p>
        <Link
          href="/reservations/new"
          className="text-blue-600 hover:text-blue-800 inline-flex items-center mt-2"
        >
          Make a reservation
          <ExternalLink className="w-4 h-4 ml-1" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayReservations.map((reservation) => (
        <div
          key={reservation.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div>
            <div className="font-medium">
              {format(reservation.startDate, "EEEE, MMMM d, yyyy")}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Users className="w-4 h-4 mr-1" />
              {reservation.guestCount}{" "}
              {reservation.guestCount === 1 ? "guest" : "guests"}
            </div>
          </div>
          <Link
            href={`/reservations/${reservation.id}`}
            className="text-blue-600 hover:text-blue-800"
          >
            <span className="sr-only">View reservation details</span>
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      ))}
      <div className="text-right mt-4">
        <Link
          href="/reservations"
          className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
        >
          View all reservations
          <ExternalLink className="w-4 h-4 ml-1" />
        </Link>
      </div>
    </div>
  );
}
