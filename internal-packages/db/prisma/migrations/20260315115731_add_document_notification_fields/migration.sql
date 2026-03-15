-- AlterTable
ALTER TABLE "public"."Document" ADD COLUMN     "notifiedAt" TIMESTAMP(3),
ADD COLUMN     "notifyOnComplete" BOOLEAN NOT NULL DEFAULT false;
