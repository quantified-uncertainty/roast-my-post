-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('ASSESSOR', 'ADVISOR', 'ENRICHER', 'EXPLAINER');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "publishedDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT[],
    "urls" TEXT[],
    "platforms" TEXT[],
    "intendedAgents" TEXT[],
    "content" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationVersion" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT,
    "grade" INTEGER,
    "agentVersionId" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,

    CONSTRAINT "EvaluationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationComment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "importance" INTEGER,
    "grade" INTEGER,
    "evaluationVersionId" TEXT NOT NULL,
    "highlightId" TEXT NOT NULL,

    CONSTRAINT "EvaluationComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationHighlight" (
    "id" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "prefix" TEXT,
    "quotedText" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,

    CONSTRAINT "EvaluationHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "agentType" "AgentType" NOT NULL,
    "description" TEXT NOT NULL,
    "genericInstructions" TEXT NOT NULL,
    "summaryInstructions" TEXT NOT NULL,
    "commentInstructions" TEXT NOT NULL,
    "gradeInstructions" TEXT,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "llmThinking" TEXT,
    "costInCents" INTEGER,
    "durationInSeconds" INTEGER,
    "logs" TEXT,
    "evaluationId" TEXT NOT NULL,
    "evaluationVersionId" TEXT,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_idx" ON "DocumentVersion"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_version_key" ON "DocumentVersion"("documentId", "version");

-- CreateIndex
CREATE INDEX "Evaluation_documentId_idx" ON "Evaluation"("documentId");

-- CreateIndex
CREATE INDEX "Evaluation_agentId_idx" ON "Evaluation"("agentId");

-- CreateIndex
CREATE INDEX "EvaluationVersion_evaluationId_idx" ON "EvaluationVersion"("evaluationId");

-- CreateIndex
CREATE INDEX "EvaluationVersion_agentVersionId_idx" ON "EvaluationVersion"("agentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationComment_highlightId_key" ON "EvaluationComment"("highlightId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentVersion_agentId_version_key" ON "AgentVersion"("agentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Job_evaluationVersionId_key" ON "Job"("evaluationVersionId");

-- CreateIndex
CREATE INDEX "Job_evaluationId_idx" ON "Job"("evaluationId");

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationVersion" ADD CONSTRAINT "EvaluationVersion_agentVersionId_fkey" FOREIGN KEY ("agentVersionId") REFERENCES "AgentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationVersion" ADD CONSTRAINT "EvaluationVersion_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationComment" ADD CONSTRAINT "EvaluationComment_evaluationVersionId_fkey" FOREIGN KEY ("evaluationVersionId") REFERENCES "EvaluationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationComment" ADD CONSTRAINT "EvaluationComment_highlightId_fkey" FOREIGN KEY ("highlightId") REFERENCES "EvaluationHighlight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentVersion" ADD CONSTRAINT "AgentVersion_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_evaluationVersionId_fkey" FOREIGN KEY ("evaluationVersionId") REFERENCES "EvaluationVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
