// src/types/address.ts

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

// Type for the form input
export interface AddressInput {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zipCode: string;
}

export type PartialAddress = Partial<Address>;

export interface AddressFormProps {
  address: Partial<Address> | null;
  onChange: (field: keyof AddressInput, value: string) => void;
  className?: string;
}

// Response type for the API
export interface AddressResponse {
  success: boolean;
  data?: Address;
  error?: string;
}
