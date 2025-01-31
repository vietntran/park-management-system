export const RESERVATION_LIMITS = {
  MAX_DAILY_RESERVATIONS: 60, // Maximum reservations per day
  MAX_CONSECUTIVE_DAYS: 3, // Maximum consecutive days per user
  MAX_ADDITIONAL_USERS: 3, // Maximum additional users per reservation
} as const;
