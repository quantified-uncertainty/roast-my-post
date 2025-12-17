-- CreateTable
CREATE TABLE "public"."MetaEvaluation" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION,
    "dimensions" JSONB,
    "rankingSessionId" TEXT,
    "rank" INTEGER,
    "relativeScore" DOUBLE PRECISION,
    "reasoning" TEXT NOT NULL,
    "judgeModel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetaEvaluation_evaluationId_idx" ON "public"."MetaEvaluation"("evaluationId");

-- CreateIndex
CREATE INDEX "MetaEvaluation_rankingSessionId_idx" ON "public"."MetaEvaluation"("rankingSessionId");

-- CreateIndex
CREATE INDEX "MetaEvaluation_type_idx" ON "public"."MetaEvaluation"("type");

-- CreateIndex
CREATE INDEX "MetaEvaluation_createdAt_idx" ON "public"."MetaEvaluation"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."MetaEvaluation" ADD CONSTRAINT "MetaEvaluation_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "public"."Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
