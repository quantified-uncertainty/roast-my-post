-- AlterTable
ALTER TABLE "AgentEvalBatch" ADD COLUMN     "requestedDocumentIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
