/*
  Warnings:

  - You are about to drop the column `similarity_score` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "similarity_score";

-- CreateTable
CREATE TABLE "date_capacities" (
    "date" TIMESTAMP(3) NOT NULL,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "maxCapacity" INTEGER NOT NULL DEFAULT 60,

    CONSTRAINT "date_capacities_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "reservation_cancellations" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cancelled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "refund_issued" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "reservation_cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reservation_cancellations_reservation_id_key" ON "reservation_cancellations"("reservation_id");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_reservation_date_fkey" FOREIGN KEY ("reservation_date") REFERENCES "date_capacities"("date") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_cancellations" ADD CONSTRAINT "reservation_cancellations_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_cancellations" ADD CONSTRAINT "reservation_cancellations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
