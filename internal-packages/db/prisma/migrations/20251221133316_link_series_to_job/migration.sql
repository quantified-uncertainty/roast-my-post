-- DropForeignKey
ALTER TABLE "public"."EvaluationVersion" DROP CONSTRAINT "EvaluationVersion_seriesId_fkey";

-- DropIndex
DROP INDEX "public"."EvaluationVersion_seriesId_idx";

-- AlterTable
ALTER TABLE "public"."EvaluationVersion" DROP COLUMN "seriesId";

-- AlterTable
ALTER TABLE "public"."Job" ADD COLUMN     "seriesId" TEXT;

-- CreateIndex
CREATE INDEX "Job_seriesId_idx" ON "public"."Job"("seriesId");

-- AddForeignKey
ALTER TABLE "public"."Job" ADD CONSTRAINT "Job_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "public"."Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
