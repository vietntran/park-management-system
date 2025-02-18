import { TransferStatus } from "@prisma/client";

import { TEST_UUIDS } from "../constants";
import { MockTransferOptions } from "../types";

export const createMockTransfer = (overrides?: MockTransferOptions) => {
  const now = new Date();
  const defaultTransfer = {
    id: TEST_UUIDS.TRANSFERS.PENDING,
    reservationId: TEST_UUIDS.RESERVATIONS.FIRST,
    fromUserId: TEST_UUIDS.USERS.PRIMARY,
    toUserId: TEST_UUIDS.USERS.SECOND,
    status: TransferStatus.PENDING,
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours from now
    requestedAt: now,
    respondedAt: null,
    spotsToTransfer: [],
  };

  return {
    ...defaultTransfer,
    ...overrides,
  };
};
