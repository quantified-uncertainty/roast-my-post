/**
 * Tests for EvaluationService
 */

import { EvaluationService } from '../EvaluationService';
import { prisma } from '@roast/db';
import { ValidationError, NotFoundError } from '@/lib/core/errors';

// Mock Prisma
jest.mock('@roast/db', () => ({
  prisma: {
    $transaction: jest.fn(),
    document: {
      findFirst: jest.fn(),
    },
    agent: {
      findUnique: jest.fn(),
    },
    evaluation: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    job: {
      create: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('EvaluationService', () => {
  let service: EvaluationService;

  beforeEach(() => {
    service = new EvaluationService();
    jest.clearAllMocks();
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
      mockPrisma.document.findFirst.mockResolvedValueOnce(null);

      const result = await service.createEvaluation(mockRequest);

      expect(result.isError()).toBe(true);
      expect(result.error()).toBeInstanceOf(NotFoundError);
      expect(mockPrisma.document.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'doc-123',
          submittedById: 'user-123'
        },
        select: { id: true }
      });
    });

    it('should check if agent exists', async () => {
      mockPrisma.document.findFirst.mockResolvedValueOnce({ id: 'doc-123' });
      mockPrisma.agent.findUnique.mockResolvedValueOnce(null);

      const result = await service.createEvaluation(mockRequest);

      expect(result.isError()).toBe(true);
      expect(result.error()).toBeInstanceOf(NotFoundError);
      expect(mockPrisma.agent.findUnique).toHaveBeenCalledWith({
        where: { id: 'agent-123' },
        select: { id: true }
      });
    });

    it('should create new evaluation when none exists', async () => {
      mockPrisma.document.findFirst.mockResolvedValueOnce({ id: 'doc-123' });
      mockPrisma.agent.findUnique.mockResolvedValueOnce({ id: 'agent-123' });
      
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          evaluation: {
            findFirst: jest.fn().mockResolvedValueOnce(null),
            create: jest.fn().mockResolvedValueOnce({ id: 'eval-123' })
          },
          job: {
            create: jest.fn().mockResolvedValueOnce({ id: 'job-123' })
          }
        };
        return await callback(mockTx);
      });
      
      mockPrisma.$transaction.mockImplementation(mockTransaction);

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
      mockPrisma.document.findFirst.mockResolvedValueOnce({ id: 'doc-123' });
      mockPrisma.agent.findUnique.mockResolvedValueOnce({ id: 'agent-123' });
      
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          evaluation: {
            findFirst: jest.fn().mockResolvedValueOnce({ id: 'eval-existing' })
          },
          job: {
            create: jest.fn().mockResolvedValueOnce({ id: 'job-new' })
          }
        };
        return await callback(mockTx);
      });
      
      mockPrisma.$transaction.mockImplementation(mockTransaction);

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
      mockPrisma.document.findFirst.mockResolvedValueOnce({ id: 'doc-123' });
      
      // First agent exists, second doesn't
      mockPrisma.agent.findUnique
        .mockResolvedValueOnce({ id: 'agent-1' })
        .mockResolvedValueOnce(null);
      
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          evaluation: {
            findFirst: jest.fn().mockResolvedValueOnce(null),
            create: jest.fn().mockResolvedValueOnce({ id: 'eval-1' })
          },
          job: {
            create: jest.fn().mockResolvedValueOnce({ id: 'job-1' })
          }
        };
        return await callback(mockTx);
      });
      
      mockPrisma.$transaction.mockImplementation(mockTransaction);

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