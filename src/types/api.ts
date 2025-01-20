// src/types/api.ts
export interface Reservation {
  id: string;
  startDate: Date;
  guestCount: number;
}

export interface UserStatusResponse {
  user: {
    id: string;
    email: string;
    phone: string | null;
    isProfileComplete: boolean;
  };
  isNewUser: boolean;
  hasUpcomingReservations: boolean;
  upcomingReservations: Reservation[];
}

export interface UserStatusError {
  error: string;
}
