-- DropForeignKey
ALTER TABLE "EvaluationVersion" DROP CONSTRAINT "EvaluationVersion_documentVersionId_fkey";

-- AlterTable
ALTER TABLE "EvaluationVersion" ADD COLUMN     "analysis" TEXT;

-- AddForeignKey
ALTER TABLE "EvaluationVersion" ADD CONSTRAINT "EvaluationVersion_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
