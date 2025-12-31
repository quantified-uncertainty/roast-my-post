-- CreateTable
CREATE TABLE "public"."Series" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SeriesRun" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeriesRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MetaEvaluation" (
    "id" TEXT NOT NULL,
    "evaluationVersionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION,
    "rankingSessionId" TEXT,
    "rank" INTEGER,
    "relativeScore" DOUBLE PRECISION,
    "reasoning" TEXT NOT NULL,
    "judgeModel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaEvaluation_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "Series_documentId_idx" ON "public"."Series"("documentId");

-- CreateIndex
CREATE INDEX "Series_createdAt_idx" ON "public"."Series"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SeriesRun_jobId_key" ON "public"."SeriesRun"("jobId");

-- CreateIndex
CREATE INDEX "SeriesRun_seriesId_idx" ON "public"."SeriesRun"("seriesId");

-- CreateIndex
CREATE INDEX "MetaEvaluation_evaluationVersionId_idx" ON "public"."MetaEvaluation"("evaluationVersionId");

-- CreateIndex
CREATE INDEX "MetaEvaluation_rankingSessionId_idx" ON "public"."MetaEvaluation"("rankingSessionId");

-- CreateIndex
CREATE INDEX "MetaEvaluation_type_idx" ON "public"."MetaEvaluation"("type");

-- CreateIndex
CREATE INDEX "MetaEvaluation_createdAt_idx" ON "public"."MetaEvaluation"("createdAt");

-- CreateIndex
CREATE INDEX "MetaEvaluationDimension_metaEvaluationId_idx" ON "public"."MetaEvaluationDimension"("metaEvaluationId");

-- CreateIndex
CREATE INDEX "MetaEvaluationDimension_name_idx" ON "public"."MetaEvaluationDimension"("name");

-- CreateIndex
CREATE INDEX "MetaEvaluationDimension_score_idx" ON "public"."MetaEvaluationDimension"("score");

-- CreateIndex
CREATE UNIQUE INDEX "MetaEvaluationDimension_metaEvaluationId_name_key" ON "public"."MetaEvaluationDimension"("metaEvaluationId", "name");

-- AddForeignKey
ALTER TABLE "public"."Series" ADD CONSTRAINT "Series_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeriesRun" ADD CONSTRAINT "SeriesRun_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "public"."Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeriesRun" ADD CONSTRAINT "SeriesRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MetaEvaluation" ADD CONSTRAINT "MetaEvaluation_evaluationVersionId_fkey" FOREIGN KEY ("evaluationVersionId") REFERENCES "public"."EvaluationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MetaEvaluationDimension" ADD CONSTRAINT "MetaEvaluationDimension_metaEvaluationId_fkey" FOREIGN KEY ("metaEvaluationId") REFERENCES "public"."MetaEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
