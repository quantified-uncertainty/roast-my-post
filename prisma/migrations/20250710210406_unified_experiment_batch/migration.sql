-- DropForeignKey
ALTER TABLE "AgentEvalBatch" DROP CONSTRAINT "AgentEvalBatch_agentId_fkey";

-- CreateIndex
CREATE INDEX "AgentEvalBatch_agentId_idx" ON "AgentEvalBatch"("agentId");

-- AddForeignKey
ALTER TABLE "AgentEvalBatch" ADD CONSTRAINT "AgentEvalBatch_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
