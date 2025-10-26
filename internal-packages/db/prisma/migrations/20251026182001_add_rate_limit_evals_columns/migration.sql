-- CreateEnum
CREATE TYPE "public"."Plan" AS ENUM ('FREE', 'PRO');


-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "evalsThisHour" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "evalsThisMonth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hourResetAt" TIMESTAMP(3),
ADD COLUMN     "monthResetAt" TIMESTAMP(3),
ADD COLUMN     "plan" "public"."Plan" NOT NULL DEFAULT 'FREE';
