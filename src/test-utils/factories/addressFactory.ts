import { TEST_UUIDS } from "../constants";
import type { MockAddressOptions } from "../types";

export const createMockAddress = (overrides?: MockAddressOptions) => ({
  line1: "123 Test St",
  line2: "Apt 4",
  city: "Test City",
  state: "TS",
  zipCode: "12345",
  userId: TEST_UUIDS.USERS.PRIMARY,
  id: TEST_UUIDS.ADDRESSES.PRIMARY,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
