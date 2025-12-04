/*
  Warnings:

  - A unique constraint covering the columns `[pgBossJobId]` on the table `Job` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Job" ADD COLUMN     "pgBossJobId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Job_pgBossJobId_key" ON "public"."Job"("pgBossJobId");
