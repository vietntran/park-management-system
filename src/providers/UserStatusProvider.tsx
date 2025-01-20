// src/providers/UserStatusProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

import type { UserStatusResponse } from "@/types/api";

interface UserStatus {
  isNewUser: boolean;
  hasUpcomingReservations: boolean;
  isLoading: boolean;
  upcomingReservations: UserStatusResponse["upcomingReservations"];
  user: UserStatusResponse["user"] | null;
}

const UserStatusContext = createContext<UserStatus>({
  isNewUser: false,
  hasUpcomingReservations: false,
  isLoading: true,
  upcomingReservations: [],
  user: null,
});

export const useUserStatus = () => useContext(UserStatusContext);

export function UserStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<UserStatus>({
    isNewUser: false,
    hasUpcomingReservations: false,
    isLoading: true,
    upcomingReservations: [],
    user: null,
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/user/status");
        if (response.ok) {
          const data = (await response.json()) as UserStatusResponse;
          setStatus({
            isNewUser: data.isNewUser,
            hasUpcomingReservations: data.hasUpcomingReservations,
            upcomingReservations: data.upcomingReservations,
            user: data.user,
            isLoading: false,
          });
        } else {
          throw new Error("Failed to fetch user status");
        }
      } catch (error) {
        console.error("Error fetching user status:", error);
        setStatus((prev) => ({ ...prev, isLoading: false }));
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
