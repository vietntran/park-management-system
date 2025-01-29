/*
  Warnings:

  - You are about to drop the column `can_modify` on the `reservation_users` table. All the data in the column will be lost.
  - You are about to drop the column `can_transfer` on the `reservation_users` table. All the data in the column will be lost.
  - You are about to drop the column `is_cancelled` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `is_transferable` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the `reservation_cancellations` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReservationUserStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "reservation_cancellations" DROP CONSTRAINT "reservation_cancellations_reservation_id_fkey";

-- DropForeignKey
ALTER TABLE "reservation_cancellations" DROP CONSTRAINT "reservation_cancellations_user_id_fkey";

-- AlterTable
ALTER TABLE "reservation_users" DROP COLUMN "can_modify",
DROP COLUMN "can_transfer",
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "status" "ReservationUserStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "reservations" DROP COLUMN "is_cancelled",
DROP COLUMN "is_transferable",
ADD COLUMN     "can_transfer" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE';

-- DropTable
DROP TABLE "reservation_cancellations";
