// src/test-utils/factories/registrationFactory.ts

import type {
  InitialRegistrationData,
  ProfileCompletionData,
} from "@/types/auth";

export const createInitialRegistrationData = (
  overrides?: Partial<InitialRegistrationData>,
): InitialRegistrationData => {
  return {
    email: "test@example.com",
    password: "Password123!@#",
    name: "Test User",
    ...overrides,
  };
};

export const createProfileCompletionData = (
  overrides?: Partial<ProfileCompletionData>,
): ProfileCompletionData => {
  return {
    phone: "1234567890",
    address: {
      line1: "123 Test St",
      line2: "Apt 4",
      city: "Test City",
      state: "TS",
      zipCode: "12345",
    },
    ...overrides,
  };
};
