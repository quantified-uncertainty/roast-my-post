-- DropForeignKey
ALTER TABLE "public"."MetaEvaluation" DROP CONSTRAINT "MetaEvaluation_evaluationId_fkey";

-- DropIndex
DROP INDEX "public"."MetaEvaluation_evaluationId_idx";

-- AlterTable
ALTER TABLE "public"."MetaEvaluation" DROP COLUMN "evaluationId",
ADD COLUMN     "evaluationVersionId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "MetaEvaluation_evaluationVersionId_idx" ON "public"."MetaEvaluation"("evaluationVersionId");

-- AddForeignKey
ALTER TABLE "public"."MetaEvaluation" ADD CONSTRAINT "MetaEvaluation_evaluationVersionId_fkey" FOREIGN KEY ("evaluationVersionId") REFERENCES "public"."EvaluationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
