-- AlterTable
ALTER TABLE "ClaimEvaluation" ADD COLUMN "variationOf" TEXT,
ADD COLUMN "submitterNotes" TEXT;

-- CreateIndex
CREATE INDEX "ClaimEvaluation_variationOf_idx" ON "ClaimEvaluation"("variationOf");

-- AddForeignKey
ALTER TABLE "ClaimEvaluation" ADD CONSTRAINT "ClaimEvaluation_variationOf_fkey" FOREIGN KEY ("variationOf") REFERENCES "ClaimEvaluation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
