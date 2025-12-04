import { vi } from 'vitest';
/**
 * Tests for EvaluationService
 */

import { EvaluationService, ValidationError, NotFoundError, type JobCreator } from '@roast/domain';
import { prisma, EvaluationRepository } from '@roast/db';
import { logger } from '@/infrastructure/logging/logger';

// Mock Prisma
vi.mock('@roast/db', () => ({
  EvaluationRepository: vi.fn().mockImplementation(() => ({
    checkDocumentAccess: vi.fn(),
    checkAgentExists: vi.fn(),
    findByDocumentAndAgent: vi.fn(),
    create: vi.fn(),
    createEvaluationWithJob: vi.fn(),
  })),
  prisma: {
    $transaction: vi.fn(),
    document: {
      findFirst: vi.fn(),
    },
    agent: {
      findUnique: vi.fn(),
    },
    evaluation: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    job: {
      create: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma);

describe('EvaluationService', () => {
  let service: EvaluationService;
  let mockEvaluationRepository: any;
  let mockJobCreator: JobCreator;

  beforeEach(() => {
    mockEvaluationRepository = new EvaluationRepository();
    mockJobCreator = {
      createJob: vi.fn().mockResolvedValue({ id: 'job-123' }),
    };
    service = new EvaluationService(mockEvaluationRepository, logger, mockJobCreator);
    vi.clearAllMocks();
  });

  describe('createEvaluation', () => {
    const mockRequest = {
      documentId: 'doc-123',
      agentId: 'agent-123',
      userId: 'user-123'
    };

    it('should validate request inputs', async () => {
      const result = await service.createEvaluation({
        documentId: '',
        agentId: 'agent-123',
        userId: 'user-123'
      });

      expect(result.isError()).toBe(true);
      const error = result.error();
      expect(error).toBeInstanceOf(ValidationError);
      expect(error?.message).toContain('Invalid evaluation request');
    });

    it('should check if document exists and user has access', async () => {
      mockEvaluationRepository.checkDocumentAccess.mockResolvedValueOnce(false);

      const result = await service.createEvaluation(mockRequest);

      expect(result.isError()).toBe(true);
      expect(result.error()).toBeInstanceOf(NotFoundError);
      expect(mockEvaluationRepository.checkDocumentAccess).toHaveBeenCalledWith('doc-123', 'user-123');
    });

    it('should check if agent exists', async () => {
      mockEvaluationRepository.checkDocumentAccess.mockResolvedValueOnce(true);
      mockEvaluationRepository.checkAgentExists.mockResolvedValueOnce(false);

      const result = await service.createEvaluation(mockRequest);

      expect(result.isError()).toBe(true);
      expect(result.error()).toBeInstanceOf(NotFoundError);
      expect(mockEvaluationRepository.checkAgentExists).toHaveBeenCalledWith('agent-123');
    });

    it('should create new evaluation when none exists', async () => {
      mockEvaluationRepository.checkDocumentAccess.mockResolvedValueOnce(true);
      mockEvaluationRepository.checkAgentExists.mockResolvedValueOnce(true);
      mockEvaluationRepository.findByDocumentAndAgent.mockResolvedValueOnce(null);
      mockEvaluationRepository.create.mockResolvedValueOnce({ id: 'eval-123' });
      (mockJobCreator.createJob as any).mockResolvedValueOnce({ id: 'job-123' });

      const result = await service.createEvaluation(mockRequest);

      expect(result.isOk()).toBe(true);
      const evaluation = result.unwrap();
      expect(evaluation).toEqual({
        evaluationId: 'eval-123',
        agentId: 'agent-123',
        jobId: 'job-123',
        created: true
      });
      expect(mockJobCreator.createJob).toHaveBeenCalledWith('eval-123');
    });

    it('should create new job for existing evaluation', async () => {
      mockEvaluationRepository.checkDocumentAccess.mockResolvedValueOnce(true);
      mockEvaluationRepository.checkAgentExists.mockResolvedValueOnce(true);
      mockEvaluationRepository.findByDocumentAndAgent.mockResolvedValueOnce({ id: 'eval-existing' });
      (mockJobCreator.createJob as any).mockResolvedValueOnce({ id: 'job-new' });

      const result = await service.createEvaluation(mockRequest);

      expect(result.isOk()).toBe(true);
      const evaluation = result.unwrap();
      expect(evaluation).toEqual({
        evaluationId: 'eval-existing',
        agentId: 'agent-123',
        jobId: 'job-new',
        created: false
      });
      expect(mockJobCreator.createJob).toHaveBeenCalledWith('eval-existing');
    });
  });

  describe('createEvaluationsForDocument', () => {
    const mockRequest = {
      documentId: 'doc-123',
      agentIds: ['agent-1', 'agent-2'],
      userId: 'user-123'
    };

    it('should validate request inputs', async () => {
      const result = await service.createEvaluationsForDocument({
        documentId: 'doc-123',
        agentIds: [],
        userId: 'user-123'
      });

      expect(result.isError()).toBe(true);
      const error = result.error();
      expect(error).toBeInstanceOf(ValidationError);
      expect(error?.details).toContain('At least one agent ID is required');
    });

    it('should handle partial successes gracefully', async () => {
      mockEvaluationRepository.checkDocumentAccess.mockResolvedValueOnce(true);

      // First agent exists, second doesn't
      mockEvaluationRepository.checkAgentExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      // First agent: no existing evaluation, create new one
      mockEvaluationRepository.findByDocumentAndAgent.mockResolvedValueOnce(null);
      mockEvaluationRepository.create.mockResolvedValueOnce({ id: 'eval-1' });
      (mockJobCreator.createJob as any).mockResolvedValueOnce({ id: 'job-1' });

      const result = await service.createEvaluationsForDocument(mockRequest);

      expect(result.isOk()).toBe(true);
      const evaluations = result.unwrap();
      expect(evaluations).toHaveLength(1);
      expect(evaluations[0].agentId).toBe('agent-1');
      expect(mockJobCreator.createJob).toHaveBeenCalledWith('eval-1');
    });

    it('should limit agent IDs to 50', async () => {
      const manyAgentIds = Array.from({ length: 51 }, (_, i) => `agent-${i}`);
      
      const result = await service.createEvaluationsForDocument({
        documentId: 'doc-123',
        agentIds: manyAgentIds,
        userId: 'user-123'
      });

      expect(result.isError()).toBe(true);
      const error = result.error();
      expect(error).toBeInstanceOf(ValidationError);
      expect(error?.details).toContain('Cannot create more than 50 evaluations at once');
    });
  });
});