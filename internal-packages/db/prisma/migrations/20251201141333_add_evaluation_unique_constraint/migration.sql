-- Add unique constraint on (documentId, agentId) to prevent duplicate evaluations
-- This ensures only one evaluation can exist per document-agent pair

-- First, remove the non-unique index since the unique constraint will provide the same functionality
DROP INDEX IF EXISTS "Evaluation_documentId_agentId_idx";

-- Add unique constraint
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_documentId_agentId_key" UNIQUE ("documentId", "agentId");
