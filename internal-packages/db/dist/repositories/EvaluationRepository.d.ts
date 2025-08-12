export interface EvaluationRepositoryInterface {
  findByDocumentAndAgent(documentId: string, agentId: string): Promise<any | null>;
  findByIdWithAccess(evaluationId: string, userId: string): Promise<any | null>;
  create(documentId: string, agentId: string): Promise<{ id: string }>;
  createJob(evaluationId: string): Promise<{ id: string }>;
  createEvaluationWithJob(documentId: string, agentId: string): Promise<{
    evaluationId: string;
    agentId: string;
    jobId: string;
    created: boolean;
  }>;
  checkDocumentAccess(documentId: string, userId: string): Promise<boolean>;
  checkAgentExists(agentId: string): Promise<boolean>;
}

export declare class EvaluationRepository implements EvaluationRepositoryInterface {
  constructor(prismaClient?: any);
  findByDocumentAndAgent(documentId: string, agentId: string): Promise<any | null>;
}