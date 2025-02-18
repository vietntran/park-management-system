import { ReservationStatus } from "@prisma/client";

import { TEST_UUIDS } from "../constants";
import { MockReservationOptions } from "../types";

export const createMockReservation = (overrides?: MockReservationOptions) => {
  const now = new Date();
  const defaultReservation = {
    id: TEST_UUIDS.RESERVATIONS.FIRST,
    primaryUserId: TEST_UUIDS.USERS.PRIMARY,
    date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: now,
    canTransfer: true,
    status: ReservationStatus.ACTIVE,
  };

  return {
    ...defaultReservation,
    ...overrides,
  };
};
