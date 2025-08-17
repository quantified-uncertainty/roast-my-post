import { vi } from 'vitest';
/**
 * Tests for EvaluationService
 */

import { EvaluationService, ValidationError, NotFoundError } from '@roast/domain';
import { prisma, EvaluationRepository } from '@roast/db';
import { logger } from '@/infrastructure/logging/logger';

// Mock Prisma
vi.mock('@roast/db', () => ({
  EvaluationRepository: vi.fn().mockImplementation(() => ({
    checkDocumentAccess: vi.fn(),
    checkAgentExists: vi.fn(),
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

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('EvaluationService', () => {
  let service: EvaluationService;
  let mockEvaluationRepository: any;

  beforeEach(() => {
    mockEvaluationRepository = new EvaluationRepository();
    service = new EvaluationService(mockEvaluationRepository, logger);
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
      mockEvaluationRepository.createEvaluationWithJob.mockResolvedValueOnce({
        evaluationId: 'eval-123',
        agentId: 'agent-123',
        jobId: 'job-123',
        created: true
      });

      const result = await service.createEvaluation(mockRequest);

      expect(result.isOk()).toBe(true);
      const evaluation = result.unwrap();
      expect(evaluation).toEqual({
        evaluationId: 'eval-123',
        agentId: 'agent-123',
        jobId: 'job-123',
        created: true
      });
    });

    it('should create new job for existing evaluation', async () => {
      mockEvaluationRepository.checkDocumentAccess.mockResolvedValueOnce(true);
      mockEvaluationRepository.checkAgentExists.mockResolvedValueOnce(true);
      mockEvaluationRepository.createEvaluationWithJob.mockResolvedValueOnce({
        evaluationId: 'eval-existing',
        agentId: 'agent-123',
        jobId: 'job-new',
        created: false
      });

      const result = await service.createEvaluation(mockRequest);

      expect(result.isOk()).toBe(true);
      const evaluation = result.unwrap();
      expect(evaluation).toEqual({
        evaluationId: 'eval-existing',
        agentId: 'agent-123',
        jobId: 'job-new',
        created: false
      });
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
      
      mockEvaluationRepository.createEvaluationWithJob.mockResolvedValueOnce({
        evaluationId: 'eval-1',
        agentId: 'agent-1',
        jobId: 'job-1',
        created: true
      });

      const result = await service.createEvaluationsForDocument(mockRequest);

      expect(result.isOk()).toBe(true);
      const evaluations = result.unwrap();
      expect(evaluations).toHaveLength(1);
      expect(evaluations[0].agentId).toBe('agent-1');
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