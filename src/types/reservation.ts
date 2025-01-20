// src/types/reservation.ts
export type SelectedUser = {
  id: string;
  name: string;
  email: string;
  canModify: boolean;
  canTransfer: boolean;
};

export type ReservationFormData = {
  reservationDate: Date;
  additionalUsers: SelectedUser[];
};
