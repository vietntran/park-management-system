/*
  Warnings:

  - You are about to drop the column `is_approved` on the `reservation_transfers` table. All the data in the column will be lost.
  - You are about to drop the column `transfer_reason` on the `reservation_transfers` table. All the data in the column will be lost.
  - You are about to drop the column `transferred_at` on the `reservation_transfers` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[reservation_id,status]` on the table `reservation_transfers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expires_at` to the `reservation_transfers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "reservation_transfers" DROP COLUMN "is_approved",
DROP COLUMN "transfer_reason",
DROP COLUMN "transferred_at",
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "is_primary_transfer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "responded_at" TIMESTAMP(3),
ADD COLUMN     "spots_to_transfer" TEXT[],
ADD COLUMN     "status" "TransferStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "reservation_transfers_reservation_id_status_key" ON "reservation_transfers"("reservation_id", "status");
