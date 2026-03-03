-- AlterTable
ALTER TABLE "AgentEvalBatch" ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "notifyOnComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "notifiedAt" TIMESTAMP(3);
