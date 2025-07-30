-- CreateIndex
CREATE INDEX "Evaluation_documentId_agentId_idx" ON "Evaluation"("documentId", "agentId");

-- CreateIndex
CREATE INDEX "EvaluationComment_evaluationVersionId_idx" ON "EvaluationComment"("evaluationVersionId");
