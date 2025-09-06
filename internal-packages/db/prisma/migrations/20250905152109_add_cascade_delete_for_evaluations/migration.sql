-- Add cascade delete for EvaluationVersion when Evaluation is deleted
ALTER TABLE "EvaluationVersion" 
DROP CONSTRAINT "EvaluationVersion_evaluationId_fkey";

ALTER TABLE "EvaluationVersion" 
ADD CONSTRAINT "EvaluationVersion_evaluationId_fkey" 
FOREIGN KEY ("evaluationId") 
REFERENCES "Evaluation"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Add cascade delete for Job when Evaluation is deleted
ALTER TABLE "Job" 
DROP CONSTRAINT "Job_evaluationId_fkey";

ALTER TABLE "Job" 
ADD CONSTRAINT "Job_evaluationId_fkey" 
FOREIGN KEY ("evaluationId") 
REFERENCES "Evaluation"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;