-- DropForeignKey
ALTER TABLE "public"."AgentEvalBatch" DROP CONSTRAINT "AgentEvalBatch_seriesId_fkey";

-- DropIndex
DROP INDEX "public"."AgentEvalBatch_seriesId_idx";

-- AlterTable
ALTER TABLE "public"."AgentEvalBatch" DROP COLUMN "seriesId";

-- AlterTable
ALTER TABLE "public"."EvaluationVersion" ADD COLUMN     "seriesId" TEXT;

-- CreateIndex
CREATE INDEX "EvaluationVersion_seriesId_idx" ON "public"."EvaluationVersion"("seriesId");

-- AddForeignKey
ALTER TABLE "public"."EvaluationVersion" ADD CONSTRAINT "EvaluationVersion_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "public"."Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
