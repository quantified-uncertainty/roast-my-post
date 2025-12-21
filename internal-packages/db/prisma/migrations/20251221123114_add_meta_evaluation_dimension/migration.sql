-- AlterTable: Drop JSON dimensions column (replaced by MetaEvaluationDimension table)
ALTER TABLE "public"."MetaEvaluation" DROP COLUMN "dimensions";

-- CreateTable
CREATE TABLE "public"."MetaEvaluationDimension" (
    "id" TEXT NOT NULL,
    "metaEvaluationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT,

    CONSTRAINT "MetaEvaluationDimension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetaEvaluationDimension_metaEvaluationId_idx" ON "public"."MetaEvaluationDimension"("metaEvaluationId");

-- CreateIndex
CREATE INDEX "MetaEvaluationDimension_name_idx" ON "public"."MetaEvaluationDimension"("name");

-- CreateIndex
CREATE INDEX "MetaEvaluationDimension_score_idx" ON "public"."MetaEvaluationDimension"("score");

-- CreateIndex
CREATE UNIQUE INDEX "MetaEvaluationDimension_metaEvaluationId_name_key" ON "public"."MetaEvaluationDimension"("metaEvaluationId", "name");

-- AddForeignKey
ALTER TABLE "public"."MetaEvaluationDimension" ADD CONSTRAINT "MetaEvaluationDimension_metaEvaluationId_fkey" FOREIGN KEY ("metaEvaluationId") REFERENCES "public"."MetaEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
