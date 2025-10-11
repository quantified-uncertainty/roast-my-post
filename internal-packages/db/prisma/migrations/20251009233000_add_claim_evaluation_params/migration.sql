-- AlterTable: Add parameters used to generate claim evaluations
ALTER TABLE "public"."ClaimEvaluation" ADD COLUMN "explanationLength" INTEGER;
ALTER TABLE "public"."ClaimEvaluation" ADD COLUMN "temperature" DOUBLE PRECISION;
ALTER TABLE "public"."ClaimEvaluation" ADD COLUMN "prompt" TEXT;
