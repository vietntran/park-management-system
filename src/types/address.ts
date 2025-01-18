export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zipCode: string;
}

export type PartialAddress = Partial<Address>;

export interface AddressFormProps {
  address?: PartialAddress;
  onChange: (field: keyof Address, value: string) => void;
  className?: string;
}