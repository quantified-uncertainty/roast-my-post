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

export class EvaluationRepository implements EvaluationRepositoryInterface {
  private prisma: typeof defaultPrisma;

  constructor(prismaClient?: typeof defaultPrisma) {
    this.prisma = prismaClient || defaultPrisma;
  }
  /**
   * Find existing evaluation by document and agent
   */
  async findByDocumentAndAgent(documentId: string, agentId: string): Promise<any | null> {
    return await this.prisma.evaluation.findFirst({
      where: { documentId, agentId }
    });
  }

  /**
   * Find evaluation by ID with user access check
   */
  async findByIdWithAccess(evaluationId: string, userId: string): Promise<any | null> {
    return await this.prisma.evaluation.findFirst({
      where: { 
        id: evaluationId,
        document: { submittedById: userId }
      },
      include: {
        document: { select: { submittedById: true } }
      }
    });
  }

  /**
   * Create a new evaluation
   */
  async create(documentId: string, agentId: string): Promise<{ id: string }> {
    const evaluation = await this.prisma.evaluation.create({
      data: {
        documentId,
        agentId,
      }
    });

    return { id: evaluation.id };
  }

  /**
   * Create a new job for an evaluation
   */
  async createJob(evaluationId: string): Promise<{ id: string }> {
    const job = await this.prisma.job.create({
      data: {
        evaluationId: evaluationId,
        status: 'PENDING',
      }
    });

    return { id: job.id };
  }

  /**
   * Create evaluation and job in transaction (main operation)
   * Handles both new evaluation creation and re-evaluation scenarios
   */
  async createEvaluationWithJob(documentId: string, agentId: string): Promise<{
    evaluationId: string;
    agentId: string;
    jobId: string;
    created: boolean;
  }> {
    return await this.prisma.$transaction(async (tx) => {
      // Check if evaluation already exists
      const existing = await tx.evaluation.findFirst({
        where: { documentId, agentId }
      });
      
      if (existing) {
        // Create new job for re-evaluation
        const job = await tx.job.create({
          data: {
            evaluationId: existing.id,
            status: 'PENDING',
          }
        });
        
        return {
          evaluationId: existing.id,
          agentId,
          jobId: job.id,
          created: false
        };
      }
      
      // Create new evaluation
      const evaluation = await tx.evaluation.create({
        data: {
          documentId,
          agentId,
        }
      });
      
      // Create job
      const job = await tx.job.create({
        data: {
          evaluationId: evaluation.id,
          status: 'PENDING',
        }
      });
      
      return {
        evaluationId: evaluation.id,
        agentId,
        jobId: job.id,
        created: true
      };
    });
  }

  /**
   * Check if document exists and user has access
   */
  async checkDocumentAccess(documentId: string, userId: string): Promise<boolean> {
    const document = await this.prisma.document.findFirst({
      where: { 
        id: documentId,
        submittedById: userId
      },
      select: { id: true }
    });

    return !!document;
  }

  /**
   * Check if agent exists
   */
  async checkAgentExists(agentId: string): Promise<boolean> {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true }
    });

    return !!agent;
  }
}