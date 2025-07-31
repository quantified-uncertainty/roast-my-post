-- DropForeignKey
ALTER TABLE "AgentEvalBatch" DROP CONSTRAINT "AgentEvalBatch_agentId_fkey";

-- DropIndex
DROP INDEX "AgentEvalBatch_agentId_idx";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "priceInDollars" DECIMAL(10,6) NOT NULL DEFAULT 0;

-- Migrate existing data from priceInCents to priceInDollars
UPDATE "Task" 
SET "priceInDollars" = CAST("priceInCents" AS DECIMAL) / 100
WHERE "priceInCents" IS NOT NULL;

-- Drop the old priceInCents column
ALTER TABLE "Task" DROP COLUMN "priceInCents";

-- AddForeignKey
ALTER TABLE "AgentEvalBatch" ADD CONSTRAINT "AgentEvalBatch_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
