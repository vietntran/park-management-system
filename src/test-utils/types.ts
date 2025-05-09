// src/__tests__/utils/types.ts
import type {
  ReservationStatus,
  ReservationUserStatus,
  User,
  VerificationToken,
} from "@prisma/client";
import type { ReservationTransfer } from "@prisma/client";

import type { Address, AddressInput } from "@/types/address";
import type { UserProfile } from "@/types/user";

// Database mock types (based on Prisma schema)
export type MockUserOptions = Partial<Omit<User, "address">> & {
  address?: MockAddressOptions | null;
};

export type MockAddressOptions = Partial<Address>;

export type MockVerificationTokenOptions = Partial<VerificationToken>;

// API response mock types (based on our custom types)
export type MockUserProfileOptions = Partial<UserProfile>;

export type MockAddressInputOptions = Partial<AddressInput>;

// Helper type to combine both database and API types when needed
export type MockUserWithProfileOptions = MockUserOptions & {
  profile?: MockUserProfileOptions;
};

export interface MockReservationOptions {
  id?: string;
  primaryUserId?: string;
  status?: ReservationStatus;
  reservationUsers?: Array<{
    userId: string;
    status: ReservationUserStatus;
    isPrimary: boolean;
    addedAt: Date;
    cancelledAt: Date | null;
    reservationId: string;
    user?: {
      id: string;
      name: string;
      email: string;
      emailVerified: Date | null;
      isProfileComplete: boolean;
    };
  }>;
  dateCapacity?: {
    totalBookings: number;
    remainingSpots: number;
  };
  reservationDate?: Date;
  createdAt?: Date;
  canTransfer?: boolean;
}
export type MockTransferOptions = Partial<ReservationTransfer>;
