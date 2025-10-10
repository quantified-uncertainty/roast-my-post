-- CreateTable
CREATE TABLE "public"."ClaimEvaluation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "context" TEXT,
    "summaryMean" DOUBLE PRECISION,
    "rawOutput" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClaimEvaluation_userId_idx" ON "public"."ClaimEvaluation"("userId");

-- CreateIndex
CREATE INDEX "ClaimEvaluation_createdAt_idx" ON "public"."ClaimEvaluation"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."ClaimEvaluation" ADD CONSTRAINT "ClaimEvaluation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
