/**
 * Evaluation Repository
 *
 * Pure data access layer for evaluations.
 * Handles all database operations related to evaluations and jobs.
 */
import { prisma as defaultPrisma } from '../client';
export interface EvaluationRepositoryInterface {
    findByDocumentAndAgent(documentId: string, agentId: string): Promise<any | null>;
    findByIdWithAccess(evaluationId: string, userId: string): Promise<any | null>;
    create(documentId: string, agentId: string): Promise<{
        id: string;
    }>;
    createJob(evaluationId: string): Promise<{
        id: string;
    }>;
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
    private prisma;
    constructor(prismaClient?: typeof defaultPrisma);
    /**
     * Find existing evaluation by document and agent
     */
    findByDocumentAndAgent(documentId: string, agentId: string): Promise<any | null>;
    /**
     * Find evaluation by ID with user access check
     */
    findByIdWithAccess(evaluationId: string, userId: string): Promise<any | null>;
    /**
     * Create a new evaluation
     */
    create(documentId: string, agentId: string): Promise<{
        id: string;
    }>;
    /**
     * Create a new job for an evaluation
     */
    createJob(evaluationId: string): Promise<{
        id: string;
    }>;
    /**
     * Create evaluation and job in transaction (main operation)
     * Handles both new evaluation creation and re-evaluation scenarios
     */
    createEvaluationWithJob(documentId: string, agentId: string): Promise<{
        evaluationId: string;
        agentId: string;
        jobId: string;
        created: boolean;
    }>;
    /**
     * Check if document exists and user has access
     */
    checkDocumentAccess(documentId: string, userId: string): Promise<boolean>;
    /**
     * Check if agent exists
     */
    checkAgentExists(agentId: string): Promise<boolean>;
}
//# sourceMappingURL=EvaluationRepository.d.ts.map