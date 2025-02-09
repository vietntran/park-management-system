import type { MockVerificationTokenOptions } from "../types";

export const createMockVerificationToken = (
  overrides?: MockVerificationTokenOptions,
) => ({
  id: "test-token-id",
  token: "test-verification-token",
  expires: new Date(),
  identifier: "test@example.com",
  createdAt: new Date(),
  ...overrides,
});
