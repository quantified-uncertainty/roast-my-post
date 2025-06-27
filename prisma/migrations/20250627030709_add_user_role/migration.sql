/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `AgentEvalBatch` table. All the data in the column will be lost.
  - You are about to drop the column `analysisInstructions` on the `AgentVersion` table. All the data in the column will be lost.
  - You are about to drop the column `commentInstructions` on the `AgentVersion` table. All the data in the column will be lost.
  - You are about to drop the column `genericInstructions` on the `AgentVersion` table. All the data in the column will be lost.
  - You are about to drop the column `gradeInstructions` on the `AgentVersion` table. All the data in the column will be lost.
  - You are about to drop the column `summaryInstructions` on the `AgentVersion` table. All the data in the column will be lost.
  - Added the required column `targetCount` to the `AgentEvalBatch` table without a default value. This is not possible if the table is not empty.
  - Made the column `version` on table `EvaluationVersion` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- DropForeignKey
ALTER TABLE "AgentEvalBatch" DROP CONSTRAINT "AgentEvalBatch_agentId_fkey";

-- DropIndex
DROP INDEX "idx_documents_published_date_desc";

-- DropIndex
DROP INDEX "idx_document_versions_lookup";

-- AlterTable
ALTER TABLE "AgentEvalBatch" DROP COLUMN "updatedAt",
ADD COLUMN     "targetCount" INTEGER NOT NULL,
ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AgentVersion" DROP COLUMN "analysisInstructions",
DROP COLUMN "commentInstructions",
DROP COLUMN "genericInstructions",
DROP COLUMN "gradeInstructions",
DROP COLUMN "summaryInstructions",
ADD COLUMN     "primaryInstructions" TEXT,
ADD COLUMN     "providesGrades" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "DocumentVersion" ADD COLUMN     "contentSearchVector" tsvector;

-- AlterTable
ALTER TABLE "EvaluationVersion" ALTER COLUMN "version" SET NOT NULL,
ALTER COLUMN "version" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_key_idx" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- AddForeignKey
ALTER TABLE "AgentEvalBatch" ADD CONSTRAINT "AgentEvalBatch_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
