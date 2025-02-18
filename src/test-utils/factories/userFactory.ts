import { TEST_UUIDS } from "../constants";
import type { MockUserOptions } from "../types";

import { createMockAddress } from "./addressFactory";

export const createMockUser = (overrides?: MockUserOptions) => {
  const now = new Date();
  const defaultUser = {
    id: TEST_UUIDS.USERS.PRIMARY,
    email: "test@example.com",
    name: "Test User",
    phone: "1234567890",
    password: "hashed_password",
    phoneVerified: false,
    isProfileComplete: false,
    emailVerified: null,
    createdAt: now,
    updatedAt: now,
  };

  if (!overrides) return defaultUser;

  const { address, ...restOverrides } = overrides;
  return {
    ...defaultUser,
    ...restOverrides,
    ...(address && { address: createMockAddress(address) }),
  };
};
