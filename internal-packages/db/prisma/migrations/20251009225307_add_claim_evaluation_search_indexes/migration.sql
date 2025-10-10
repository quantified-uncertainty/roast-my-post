-- AlterTable
ALTER TABLE "public"."ClaimEvaluation" ADD COLUMN "claim_search_text" tsvector
  GENERATED ALWAYS AS (to_tsvector('english'::regconfig, COALESCE(claim, ''::text) || ' ' || COALESCE(context, ''::text))) STORED;

-- CreateIndex
CREATE INDEX "ClaimEvaluation_userId_createdAt_idx" ON "public"."ClaimEvaluation"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ClaimEvaluation_userId_summaryMean_idx" ON "public"."ClaimEvaluation"("userId", "summaryMean");

-- CreateIndex
CREATE INDEX "ClaimEvaluation_claim_search_text_idx" ON "public"."ClaimEvaluation" USING GIN ("claim_search_text");
