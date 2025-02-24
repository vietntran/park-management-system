// src/test-utils/constants.ts

// Helper to generate sequential UUIDs
const generateSequentialUuid = (sequence: number): string => {
  return `123e4567-e89b-12d3-a456-${sequence.toString().padStart(12, "0")}`;
};

export const TEST_UUIDS = {
  // Users - Following the 4 users per reservation limit, plus a test user for validation testing
  USERS: {
    PRIMARY: generateSequentialUuid(1),
    SECOND: generateSequentialUuid(2),
    THIRD: generateSequentialUuid(3),
    FOURTH: generateSequentialUuid(4),
    FIFTH: generateSequentialUuid(18), // Added for validation tests
  },

  // Addresses - One per user
  ADDRESSES: {
    PRIMARY: generateSequentialUuid(5),
    SECOND: generateSequentialUuid(6),
    THIRD: generateSequentialUuid(7),
    FOURTH: generateSequentialUuid(8),
    FIFTH: generateSequentialUuid(19), // Added for validation tests
  },

  // Reservations - For testing consecutive dates limit (3) and multiple scenarios
  RESERVATIONS: {
    FIRST: generateSequentialUuid(9),
    SECOND: generateSequentialUuid(10),
    THIRD: generateSequentialUuid(11),
    FOURTH: generateSequentialUuid(12), // For testing the 3 consecutive dates limit
    NOT_FOUND: generateSequentialUuid(13),
  },

  // Transfers - For testing various transfer scenarios
  TRANSFERS: {
    PENDING: generateSequentialUuid(14),
    ACCEPTED: generateSequentialUuid(15),
    DECLINED: generateSequentialUuid(16),
    EXPIRED: generateSequentialUuid(17),
  },
} as const;

// Type for easier access and autocompletion
export type TestUuid = typeof TEST_UUIDS;
