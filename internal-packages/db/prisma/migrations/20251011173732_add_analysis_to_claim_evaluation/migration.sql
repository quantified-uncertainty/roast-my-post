-- Add analysis fields to ClaimEvaluation
ALTER TABLE "ClaimEvaluation" ADD COLUMN "analysisText" TEXT;
ALTER TABLE "ClaimEvaluation" ADD COLUMN "analysisGeneratedAt" TIMESTAMP(3);
