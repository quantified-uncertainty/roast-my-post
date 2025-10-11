-- Add ephemeralBatchId to Document
ALTER TABLE "Document" ADD COLUMN "ephemeralBatchId" TEXT;

-- Add index for ephemeralBatchId on Document
CREATE INDEX "Document_ephemeralBatchId_idx" ON "Document"("ephemeralBatchId");

-- Add ephemeralBatchId to Agent
ALTER TABLE "Agent" ADD COLUMN "ephemeralBatchId" TEXT;

-- Add unique constraint for ephemeralBatchId on Agent
CREATE UNIQUE INDEX "Agent_ephemeralBatchId_key" ON "Agent"("ephemeralBatchId");

-- Add new columns to AgentEvalBatch
ALTER TABLE "AgentEvalBatch" 
ADD COLUMN "userId" TEXT,
ADD COLUMN "trackingId" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "isEphemeral" BOOLEAN NOT NULL DEFAULT false;

-- Make targetCount nullable
ALTER TABLE "AgentEvalBatch" ALTER COLUMN "targetCount" DROP NOT NULL;

-- Update existing batches with userId from their agent's submittedById
UPDATE "AgentEvalBatch" b
SET "userId" = a."submittedById"
FROM "Agent" a
WHERE b."agentId" = a.id;

-- Now make userId required
ALTER TABLE "AgentEvalBatch" ALTER COLUMN "userId" SET NOT NULL;

-- Add indexes for AgentEvalBatch
CREATE INDEX "AgentEvalBatch_userId_idx" ON "AgentEvalBatch"("userId");
CREATE INDEX "AgentEvalBatch_expiresAt_idx" ON "AgentEvalBatch"("expiresAt");

-- Add unique constraint for userId and trackingId combination
CREATE UNIQUE INDEX "AgentEvalBatch_userId_trackingId_key" ON "AgentEvalBatch"("userId", "trackingId");

-- Add foreign key constraints
ALTER TABLE "Document" ADD CONSTRAINT "Document_ephemeralBatchId_fkey" 
FOREIGN KEY ("ephemeralBatchId") REFERENCES "AgentEvalBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Agent" ADD CONSTRAINT "Agent_ephemeralBatchId_fkey" 
FOREIGN KEY ("ephemeralBatchId") REFERENCES "AgentEvalBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentEvalBatch" ADD CONSTRAINT "AgentEvalBatch_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;