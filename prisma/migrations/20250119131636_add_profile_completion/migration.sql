-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_profile_complete" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "phone_verified" SET DEFAULT false;
