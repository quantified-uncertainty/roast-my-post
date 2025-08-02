-- AlterTable
ALTER TABLE "EvaluationComment" ADD COLUMN     "header" TEXT,
ADD COLUMN     "level" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "source" TEXT;