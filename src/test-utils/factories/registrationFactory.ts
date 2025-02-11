// src/test-utils/factories/registrationFactory.ts

export interface RegistrationData {
  email: string;
  password: string;
  name: string;
  phone: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  acceptTerms: boolean;
}

export const createRegistrationData = (
  overrides?: Partial<RegistrationData>,
): RegistrationData => {
  return {
    email: "test@example.com",
    password: "Password123!@#",
    name: "Test User",
    phone: "1234567890",
    address: {
      line1: "123 Test St",
      line2: "Apt 4",
      city: "Test City",
      state: "TS",
      zipCode: "12345",
    },
    acceptTerms: true,
    ...overrides,
  };
};
