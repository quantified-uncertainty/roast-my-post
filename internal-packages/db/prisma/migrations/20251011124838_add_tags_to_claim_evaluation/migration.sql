-- AlterTable
ALTER TABLE "ClaimEvaluation" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "ClaimEvaluation_tags_idx" ON "ClaimEvaluation" USING GIN ("tags");
