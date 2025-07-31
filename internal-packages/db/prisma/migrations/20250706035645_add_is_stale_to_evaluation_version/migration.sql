-- AlterTable
ALTER TABLE "EvaluationVersion" ADD COLUMN     "isStale" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "EvaluationVersion_isStale_idx" ON "EvaluationVersion"("isStale");
