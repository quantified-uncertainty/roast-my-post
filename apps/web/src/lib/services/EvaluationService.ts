/**
 * Evaluation Service
 * 
 * Handles all evaluation-related business logic including:
 * - Creating evaluations for documents
 * - Managing evaluation jobs
 * - Re-evaluation logic
 * - Validation and error handling
 */

import { prisma } from '@roast/db';
import { nanoid } from 'nanoid';
import { logger } from '@/lib/logger';
import { Result } from '@/lib/core/result';
import { AppError, ValidationError, NotFoundError } from '@/lib/core/errors';

export interface CreateEvaluationRequest {
  documentId: string;
  agentId: string;
  userId: string;
}

export interface CreateEvaluationsForDocumentRequest {
  documentId: string;
  agentIds: string[];
  userId: string;
}

export interface EvaluationCreationResult {
  evaluationId: string;
  agentId: string;
  jobId: string;
  created: boolean; // false if evaluation already existed and we just created a new job
}

export class EvaluationService {
  /**
   * Create a single evaluation for a document with an agent
   */
  async createEvaluation(
    request: CreateEvaluationRequest
  ): Promise<Result<EvaluationCreationResult, AppError>> {
    try {
      // Validate inputs
      const validation = this.validateCreateRequest(request);
      if (!validation.isValid) {
        return Result.fail(
          new ValidationError('Invalid evaluation request', validation.errors)
        );
      }

      // Verify document exists and user has access
      const documentCheck = await this.checkDocumentAccess(request.documentId, request.userId);
      if (documentCheck.isError()) {
        return documentCheck;
      }

      // Verify agent exists
      const agentCheck = await this.checkAgentExists(request.agentId);
      if (agentCheck.isError()) {
        return agentCheck;
      }

      // Create evaluation and job in transaction
      const result = await this.createEvaluationTransaction(
        request.documentId,
        request.agentId
      );

      logger.info('Evaluation created successfully', {
        evaluationId: result.evaluationId,
        documentId: request.documentId,
        agentId: request.agentId,
        created: result.created
      });

      return Result.ok(result);
    } catch (error) {
      logger.error('Error creating evaluation', {
        error,
        documentId: request.documentId,
        agentId: request.agentId
      });
      return Result.fail(
        new AppError('Failed to create evaluation', 'EVALUATION_CREATE_ERROR', 500, error)
      );
    }
  }

  /**
   * Create multiple evaluations for a document with multiple agents
   */
  async createEvaluationsForDocument(
    request: CreateEvaluationsForDocumentRequest
  ): Promise<Result<EvaluationCreationResult[], AppError>> {
    try {
      // Validate inputs
      const validation = this.validateCreateMultipleRequest(request);
      if (!validation.isValid) {
        return Result.fail(
          new ValidationError('Invalid evaluations request', validation.errors)
        );
      }

      // Verify document exists and user has access
      const documentCheck = await this.checkDocumentAccess(request.documentId, request.userId);
      if (documentCheck.isError()) {
        return documentCheck;
      }

      // Create evaluations for each agent
      const results: EvaluationCreationResult[] = [];
      const errors: string[] = [];

      for (const agentId of request.agentIds) {
        try {
          // Verify agent exists
          const agentCheck = await this.checkAgentExists(agentId);
          if (agentCheck.isError()) {
            errors.push(`Agent ${agentId}: ${agentCheck.error().message}`);
            continue;
          }

          // Create evaluation
          const result = await this.createEvaluationTransaction(
            request.documentId,
            agentId
          );

          results.push(result);

          logger.info('Evaluation created in batch', {
            evaluationId: result.evaluationId,
            documentId: request.documentId,
            agentId: agentId,
            created: result.created
          });
        } catch (error) {
          logger.error('Failed to create evaluation in batch', {
            error,
            documentId: request.documentId,
            agentId
          });
          errors.push(`Agent ${agentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // If we have some successes, return them even if some failed
      if (results.length > 0) {
        if (errors.length > 0) {
          logger.warn('Some evaluations failed to create', {
            documentId: request.documentId,
            successCount: results.length,
            errorCount: errors.length,
            errors
          });
        }
        return Result.ok(results);
      }

      // All failed
      return Result.fail(
        new AppError(
          `Failed to create any evaluations: ${errors.join('; ')}`,
          'EVALUATION_BATCH_CREATE_ERROR',
          400
        )
      );
    } catch (error) {
      logger.error('Error creating evaluations batch', {
        error,
        documentId: request.documentId,
        agentCount: request.agentIds.length
      });
      return Result.fail(
        new AppError('Failed to create evaluations', 'EVALUATION_BATCH_CREATE_ERROR', 500, error)
      );
    }
  }

  /**
   * Re-run an existing evaluation (creates new job)
   */
  async rerunEvaluation(
    evaluationId: string,
    userId: string
  ): Promise<Result<{ jobId: string }, AppError>> {
    try {
      // Check if evaluation exists and user has access
      const evaluation = await prisma.evaluation.findFirst({
        where: { 
          id: evaluationId,
          document: { submittedById: userId }
        },
        include: {
          document: { select: { submittedById: true } }
        }
      });

      if (!evaluation) {
        return Result.fail(
          new NotFoundError('Evaluation', evaluationId)
        );
      }

      // Create new job for re-evaluation
      const job = await prisma.job.create({
        data: {
          evaluationId: evaluationId,
          status: 'PENDING',
        }
      });

      logger.info('Evaluation re-run job created', {
        evaluationId,
        jobId: job.id,
        userId
      });

      return Result.ok({ jobId: job.id });
    } catch (error) {
      logger.error('Error creating re-run job', { error, evaluationId, userId });
      return Result.fail(
        new AppError('Failed to re-run evaluation', 'EVALUATION_RERUN_ERROR', 500, error)
      );
    }
  }

  /**
   * Private method to create evaluation and job in transaction
   */
  private async createEvaluationTransaction(
    documentId: string,
    agentId: string
  ): Promise<EvaluationCreationResult> {
    return await prisma.$transaction(async (tx) => {
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
   * Validate single evaluation creation request
   */
  private validateCreateRequest(request: CreateEvaluationRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.documentId || typeof request.documentId !== 'string') {
      errors.push('Document ID is required and must be a string');
    }

    if (!request.agentId || typeof request.agentId !== 'string') {
      errors.push('Agent ID is required and must be a string');
    }

    if (!request.userId || typeof request.userId !== 'string') {
      errors.push('User ID is required and must be a string');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate multiple evaluations creation request
   */
  private validateCreateMultipleRequest(request: CreateEvaluationsForDocumentRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.documentId || typeof request.documentId !== 'string') {
      errors.push('Document ID is required and must be a string');
    }

    if (!Array.isArray(request.agentIds)) {
      errors.push('Agent IDs must be an array');
    } else {
      if (request.agentIds.length === 0) {
        errors.push('At least one agent ID is required');
      }

      if (request.agentIds.length > 50) {
        errors.push('Cannot create more than 50 evaluations at once');
      }

      const invalidAgentIds = request.agentIds.filter(id => typeof id !== 'string' || !id.trim());
      if (invalidAgentIds.length > 0) {
        errors.push('All agent IDs must be non-empty strings');
      }
    }

    if (!request.userId || typeof request.userId !== 'string') {
      errors.push('User ID is required and must be a string');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if document exists and user has access
   */
  private async checkDocumentAccess(documentId: string, userId: string): Promise<Result<void, AppError>> {
    const document = await prisma.document.findFirst({
      where: { 
        id: documentId,
        submittedById: userId
      },
      select: { id: true }
    });

    if (!document) {
      return Result.fail(
        new NotFoundError('Document', documentId)
      );
    }

    return Result.ok(undefined);
  }

  /**
   * Check if agent exists
   */
  private async checkAgentExists(agentId: string): Promise<Result<void, AppError>> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true }
    });

    if (!agent) {
      return Result.fail(
        new NotFoundError('Agent', agentId)
      );
    }

    return Result.ok(undefined);
  }
}