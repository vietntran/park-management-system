// src/providers/UserStatusProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

import type { ApiResponse } from "@/types/api";
import type { UserProfile, UserStatus } from "@/types/user";

interface UserContextStatus {
  isNewUser: boolean;
  hasUpcomingReservations: boolean;
  isLoading: boolean;
  upcomingReservations: UserStatus["upcomingReservations"];
  user: UserProfile | null;
  error: string | null;
}

const UserStatusContext = createContext<UserContextStatus>({
  isNewUser: false,
  hasUpcomingReservations: false,
  isLoading: true,
  upcomingReservations: [],
  user: null,
  error: null,
});

export const useUserStatus = () => useContext(UserStatusContext);

export function UserStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<UserContextStatus>({
    isNewUser: false,
    hasUpcomingReservations: false,
    isLoading: false,
    upcomingReservations: [],
    user: null,
    error: null,
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/user/status");
        const result = (await response.json()) as ApiResponse<UserStatus>;

        if (!response.ok || !result.success) {
          setStatus((prev) => ({
            ...prev,
            isLoading: false,
            error: !result.success
              ? result.error
              : `HTTP error! status: ${response.status}`,
          }));
          return;
        }

        setStatus({
          isNewUser: result.data.isNewUser,
          hasUpcomingReservations: result.data.hasUpcomingReservations,
          upcomingReservations: result.data.upcomingReservations,
          user: result.data.user,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred";

        console.error("Error fetching user status:", error);
        setStatus((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    };

    fetchStatus();
  }, []);

  return (
    <UserStatusContext.Provider value={status}>
      {children}
    </UserStatusContext.Provider>
  );
}
