import type { ApiResponse } from "./api";

export interface Address {
  id?: string;
  userId?: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zipCode: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Form types
export interface AddressInput {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zipCode: string;
}

export type PartialAddress = Partial<Address>;

// UI Component types
export interface AddressFormProps {
  address: PartialAddress | null;
  onChange: (field: keyof AddressInput, value: string) => void;
  className?: string;
}

// API Response types
export type AddressResponse = ApiResponse<Address>;
