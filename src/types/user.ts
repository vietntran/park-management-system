// src/types/user.ts
import type { ApiResponse } from "./api";

export interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  isProfileComplete: boolean;
}

export interface UserStatus {
  user: UserProfile;
  isNewUser: boolean;
  hasUpcomingReservations: boolean;
  upcomingReservations: Array<{
    id: string;
    startDate: Date;
    guestCount: number;
  }>;
}

export type UserStatusResponse = ApiResponse<UserStatus>;
