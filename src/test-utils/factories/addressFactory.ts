import type { MockAddressOptions } from "../types";

export const createMockAddress = (overrides?: MockAddressOptions) => ({
  line1: "123 Test St",
  line2: "Apt 4",
  city: "Test City",
  state: "TS",
  zipCode: "12345",
  userId: "test-user-id",
  id: "test-address-id",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
