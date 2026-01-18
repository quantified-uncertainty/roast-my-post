-- CreateTable
CREATE TABLE "public"."ValidationBaseline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "agentId" TEXT NOT NULL,
    "commitHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "ValidationBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ValidationBaselineSnapshot" (
    "id" TEXT NOT NULL,
    "baselineId" TEXT NOT NULL,
    "evaluationVersionId" TEXT NOT NULL,

    CONSTRAINT "ValidationBaselineSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ValidationBaseline_agentId_idx" ON "public"."ValidationBaseline"("agentId");

-- CreateIndex
CREATE INDEX "ValidationBaseline_createdAt_idx" ON "public"."ValidationBaseline"("createdAt");

-- CreateIndex
CREATE INDEX "ValidationBaselineSnapshot_baselineId_idx" ON "public"."ValidationBaselineSnapshot"("baselineId");

-- CreateIndex
CREATE INDEX "ValidationBaselineSnapshot_evaluationVersionId_idx" ON "public"."ValidationBaselineSnapshot"("evaluationVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ValidationBaselineSnapshot_baselineId_evaluationVersionId_key" ON "public"."ValidationBaselineSnapshot"("baselineId", "evaluationVersionId");

-- AddForeignKey
ALTER TABLE "public"."ValidationBaseline" ADD CONSTRAINT "ValidationBaseline_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ValidationBaseline" ADD CONSTRAINT "ValidationBaseline_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ValidationBaselineSnapshot" ADD CONSTRAINT "ValidationBaselineSnapshot_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "public"."ValidationBaseline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ValidationBaselineSnapshot" ADD CONSTRAINT "ValidationBaselineSnapshot_evaluationVersionId_fkey" FOREIGN KEY ("evaluationVersionId") REFERENCES "public"."EvaluationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
