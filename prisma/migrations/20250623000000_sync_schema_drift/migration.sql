-- CreateTable
CREATE TABLE IF NOT EXISTS "AgentEvalBatch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentEvalBatch_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AgentVersion" 
ADD COLUMN IF NOT EXISTS "extendedCapabilityId" TEXT,
ADD COLUMN IF NOT EXISTS "readme" TEXT,
ADD COLUMN IF NOT EXISTS "selfCritiqueInstructions" TEXT,
ALTER COLUMN "genericInstructions" DROP NOT NULL,
ALTER COLUMN "summaryInstructions" DROP NOT NULL,
ALTER COLUMN "commentInstructions" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DocumentVersion" 
ADD COLUMN IF NOT EXISTS "importUrl" TEXT;

-- AlterTable
ALTER TABLE "EvaluationVersion" 
ADD COLUMN IF NOT EXISTS "selfCritique" TEXT,
ADD COLUMN IF NOT EXISTS "version" INTEGER;

-- AlterTable
ALTER TABLE "Job" 
ADD COLUMN IF NOT EXISTS "agentEvalBatchId" TEXT,
ADD COLUMN IF NOT EXISTS "originalJobId" TEXT;

-- AlterTable
ALTER TABLE "Task" 
ADD COLUMN IF NOT EXISTS "llmInteractions" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EvaluationVersion_evaluationId_version_key" ON "EvaluationVersion"("evaluationId", "version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Job_agentEvalBatchId_idx" ON "Job"("agentEvalBatchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Job_originalJobId_idx" ON "Job"("originalJobId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_agentEvalBatchId_fkey" FOREIGN KEY ("agentEvalBatchId") REFERENCES "AgentEvalBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_originalJobId_fkey" FOREIGN KEY ("originalJobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvalBatch" ADD CONSTRAINT "AgentEvalBatch_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;