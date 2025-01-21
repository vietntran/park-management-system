import { Metadata } from "next";

import { ReservationForm } from "@/components/reservation/ReservationForm";

export const metadata: Metadata = {
  title: "New Reservation",
  description: "Create a new park reservation",
};

export default function NewReservationPage() {
  return (
    <div className="container mx-auto py-10">
      <ReservationForm />
    </div>
  );
}
