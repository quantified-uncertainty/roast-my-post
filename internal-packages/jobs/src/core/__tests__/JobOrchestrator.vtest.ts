import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobOrchestrator } from '../JobOrchestrator';
import { analyzeDocument, getWorkerId } from '@roast/ai/server';
import { prisma, JobStatus } from '@roast/db';
import type { Logger } from '../../types';

// Mock dependencies
vi.mock('@roast/ai/server', () => ({
  analyzeDocument: vi.fn(),
  getWorkerId: vi.fn(),
}));

vi.mock('@roast/ai', () => ({
  initializeAI: vi.fn(),
}));

vi.mock('@roast/db', () => ({
  prisma: {
    evaluationVersion: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    task: {
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    evaluationHighlight: {
      create: vi.fn(),
    },
    evaluationComment: {
      create: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
  JobStatus: {
    PENDING: 'PENDING',
    RUNNING: 'RUNNING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
  },
}));

describe('JobOrchestrator', () => {
  let orchestrator: JobOrchestrator;
  let mockJobRepository: any;
  let mockJobService: any;
  let mockLogger: Logger;
  let mockAnalyzeDocument: any;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getWorkerId).mockReturnValue(undefined);
    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    // Create mock job repository
    mockJobRepository = {
      claimNextPendingJob: vi.fn(),
      updateStatus: vi.fn(),
      findById: vi.fn().mockResolvedValue({ status: JobStatus.RUNNING }),
      findByIdWithRelations: vi.fn(),
    } as any;

    mockAnalyzeDocument = analyzeDocument;
    (prisma.task.aggregate as any).mockResolvedValue({
      _sum: { priceInDollars: 0.5 },
    });

    mockJobService = {
      markAsCompleted: vi.fn().mockResolvedValue({ id: 'job-1', status: JobStatus.COMPLETED }),
      markAsFailed: vi.fn().mockResolvedValue({ id: 'job-1', status: JobStatus.FAILED }),
    } as any;

    orchestrator = new JobOrchestrator(mockJobRepository, mockLogger, mockJobService);
  });

  describe('processJob', () => {
    it('should process a job successfully', async () => {
      const mockJob = createMockJob();
      const mockAnalysisResult = createMockAnalysisResult();

      mockAnalyzeDocument.mockResolvedValue(mockAnalysisResult);

      (prisma.evaluationVersion.findFirst as any).mockResolvedValue(null);
      (prisma.evaluationVersion.create as any).mockResolvedValue({ id: 'eval-version-1' });

      const result = await orchestrator.processJob(mockJob);

      expect(result.success).toBe(true);
      expect(mockJobRepository.findById).toHaveBeenCalledWith('job-1');
      expect(mockJobService.markAsCompleted).toHaveBeenCalledWith('job-1', expect.objectContaining({
        llmThinking: 'Test thinking',
      }));
      expect(mockLogger.info).toHaveBeenCalledWith('[Job job-1] Starting processing...');
    });

    it('should handle job processing failure', async () => {
      const mockJob = createMockJob();
      const error = new Error('Analysis failed');

      mockAnalyzeDocument.mockRejectedValue(error);

      const result = await orchestrator.processJob(mockJob);

      expect(result.success).toBe(false);
      expect(result.error).toEqual(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[Job job-1] processing failed:',
        error
      );
      expect(mockJobService.markAsFailed).toHaveBeenCalledWith('job-1', error);
      expect(mockJobService.markAsCompleted).not.toHaveBeenCalled();
    });
  });

  describe('processJob', () => {
    it('should return the completed job and execution log', async () => {
      const mockJob = createMockJob();
      const mockAnalysisResult = createMockAnalysisResult();
      const completedJob = { ...mockJob, status: JobStatus.COMPLETED };

      mockAnalyzeDocument.mockResolvedValue(mockAnalysisResult);
      mockJobService.markAsCompleted.mockResolvedValue(completedJob);

      (prisma.evaluationVersion.findFirst as any).mockResolvedValue(null);
      (prisma.evaluationVersion.create as any).mockResolvedValue({ id: 'eval-version-1' });

      const result = await orchestrator.processJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.job).toEqual(completedJob);
      expect(result.logContent).toContain('Job Execution Log');
      expect(result.logContent).toContain('job-1');
    });

    it('should handle missing document version', async () => {
      const mockJob = createMockJob();
      mockJob.evaluation.document.versions = [];

      const result = await orchestrator.processJob(mockJob);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(mockJobService.markAsFailed).toHaveBeenCalledWith('job-1', result.error);
      expect(mockAnalyzeDocument).not.toHaveBeenCalled();
      expect(prisma.evaluationVersion.create).not.toHaveBeenCalled();
      expect(mockJobService.markAsCompleted).not.toHaveBeenCalled();
    });

    it('should handle missing agent version', async () => {
      const mockJob = createMockJob();
      mockJob.evaluation.agent.versions = [];

      const result = await orchestrator.processJob(mockJob);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(mockJobService.markAsFailed).toHaveBeenCalledWith('job-1', result.error);
      expect(mockAnalyzeDocument).not.toHaveBeenCalled();
      expect(prisma.evaluationVersion.create).not.toHaveBeenCalled();
      expect(mockJobService.markAsCompleted).not.toHaveBeenCalled();
    });

    it('should save highlights to database', async () => {
      const mockJob = createMockJob();
      const mockAnalysisResult = createMockAnalysisResult();

      mockAnalysisResult.highlights = [
        {
          description: 'Test highlight',
          importance: 70,
          grade: 90,
          highlight: {
            startOffset: 0,
            endOffset: 10,
            quotedText: 'This is te',
          },
        },
      ];

      mockAnalyzeDocument.mockResolvedValue(mockAnalysisResult);
      mockJobRepository.updateStatus.mockResolvedValue(mockJob);

      (prisma.evaluationVersion.findFirst as any).mockResolvedValue(null);
      (prisma.evaluationVersion.create as any).mockResolvedValue({ id: 'eval-version-1' });
      (prisma.evaluationHighlight.create as any).mockResolvedValue({ id: 'highlight-1' });
      (prisma.evaluationComment.create as any).mockResolvedValue({ id: 'comment-1' });

      const result = await orchestrator.processJob(mockJob);

      expect(result.success).toBe(true);
      expect(prisma.evaluationHighlight.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          startOffset: 0, endOffset: 10, quotedText: 'This is te', isValid: true, error: null,
        }),
      });
      expect(prisma.evaluationComment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          evaluationVersionId: 'eval-version-1', highlightId: 'highlight-1', description: 'Test highlight',
          importance: 70, grade: 90,
        }),
      });
    });

    it('should handle cancelled job', async () => {
      const mockJob = createMockJob();

      mockJobRepository.findById.mockResolvedValue({ status: JobStatus.CANCELLED });

      const result = await orchestrator.processJob(mockJob);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Job was cancelled');
      expect(mockLogger.info).toHaveBeenCalledWith('[Job job-1] Job was cancelled, skipping processing');
      expect(mockAnalyzeDocument).not.toHaveBeenCalled();
      expect(mockJobService.markAsCompleted).not.toHaveBeenCalled();
      expect(mockJobService.markAsFailed).not.toHaveBeenCalled();
    });

    it('should persist task costs and include costs from earlier attempts', async () => {
      const mockJob = createMockJob();
      const mockAnalysisResult = createMockAnalysisResult();

      mockAnalysisResult.tasks = [
        {
          name: 'Task 1',
          modelName: 'claude-3',
          priceInDollars: 0.25,
          timeInSeconds: 2,
          log: 'Task log',
        },
        {
          name: 'Task 2',
          modelName: 'claude-3',
          priceInDollars: 0.35,
          timeInSeconds: 3,
          log: 'Task log',
        },
      ];

      mockAnalyzeDocument.mockResolvedValue(mockAnalysisResult);
      mockJobService.markAsCompleted.mockResolvedValue(mockJob);

      (prisma.evaluationVersion.findFirst as any).mockResolvedValue(null);
      (prisma.evaluationVersion.create as any).mockResolvedValue({ id: 'eval-version-1' });
      (prisma.task.aggregate as any).mockResolvedValue({
        _sum: { priceInDollars: 0.85 },
      });

      const result = await orchestrator.processJob(mockJob);

      expect(result.success).toBe(true);
      expect(prisma.task.create).toHaveBeenCalledTimes(2);
      for (const task of mockAnalysisResult.tasks) {
        expect(prisma.task.create).toHaveBeenCalledWith({ data: { ...task, jobId: 'job-1' } });
      }
      expect(result.logContent).toContain('Cost: $0.2500');
      expect(result.logContent).toContain('Cost: $0.3500');
      expect(mockJobService.markAsCompleted).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          llmThinking: 'Test thinking',
          priceInDollars: 0.85,
        })
      );
      expect(prisma.task.aggregate).toHaveBeenCalledWith({
        where: { jobId: 'job-1' },
        _sum: { priceInDollars: true },
      });
    });
  });

  // Helper functions to create mock data
  function createMockJob() {
    return {
      id: 'job-1',
      status: JobStatus.PENDING,
      evaluationId: 'eval-1',
      originalJobId: null,
      agentEvalBatchId: null,
      attempts: 1,
      createdAt: new Date('2024-01-01'),
      startedAt: null,
      completedAt: null,
      error: null,
      llmThinking: null,
      priceInDollars: null,
      evaluation: {
        id: 'eval-1',
        document: {
          id: 'doc-1',
          publishedDate: new Date('2024-01-01'),
          versions: [
            {
              id: 'doc-version-1',
              title: 'Test Document',
              content: 'This is test content',
              fullContent: 'This is test content',
              authors: ['Test Author'],
              version: 1,
              urls: ['https://example.com'],
              platforms: ['test'],
              intendedAgents: [],
            },
          ],
        },
        agent: {
          id: 'agent-1',
          submittedBy: { id: 'user-1' },
          versions: [
            {
              id: 'agent-version-1',
              name: 'Test Agent',
              version: 1,
              description: 'Test agent description',
              primaryInstructions: 'Test instructions',
              selfCritiqueInstructions: null,
              providesGrades: true,
              extendedCapabilityId: null,
              pluginIds: [],
            },
          ],
        },
      },
    } as any;
  }

  function createMockAnalysisResult() {
    return {
      summary: 'Test summary',
      analysis: 'Test analysis',
      grade: 75,
      selfCritique: null,
      highlights: [] as any[],
      thinking: 'Test thinking',
      tasks: [
        {
          name: 'Analysis',
          modelName: 'claude-3',
          priceInDollars: 0.5,
          timeInSeconds: 5,
          log: 'Analysis log',
        },
      ],
    };
  }
});
