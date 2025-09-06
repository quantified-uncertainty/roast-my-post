import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobOrchestrator } from '../JobOrchestrator';
import { JobService } from '../JobService';
import { analyzeDocument } from '@roast/ai';
import { prisma, JobStatus } from '@roast/db';
import { fetchJobCostWithRetry } from '@roast/ai';
import type { Logger } from '../../types';

// Mock dependencies
vi.mock('@roast/ai', () => ({
  analyzeDocument: vi.fn(),
  initializeAI: vi.fn(),
  HeliconeSessionManager: {
    forJob: vi.fn(() => ({
      trackAnalysis: vi.fn((type, fn) => fn()),
    })),
  },
  setGlobalSessionManager: vi.fn(),
  fetchJobCostWithRetry: vi.fn(),
}));

vi.mock('@roast/db', () => ({
  prisma: {
    job: {
      findUnique: vi.fn(),
    },
    evaluationVersion: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    task: {
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
  },
}));

describe('JobOrchestrator', () => {
  let orchestrator: JobOrchestrator;
  let mockJobService: any;
  let mockLogger: any;
  let mockAnalyzeDocument: any;
  let mockFetchJobCost: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    // Create mock job service
    mockJobService = {
      claimNextPendingJob: vi.fn(),
      markAsRunning: vi.fn(),
      markAsCompleted: vi.fn(),
      markAsFailed: vi.fn(),
      createRetryJob: vi.fn(),
      getJobWithRelations: vi.fn(),
    } as any;

    mockAnalyzeDocument = analyzeDocument;
    mockFetchJobCost = fetchJobCostWithRetry;

    orchestrator = new JobOrchestrator(mockJobService, mockLogger);
  });

  describe('run', () => {
    it('should return false when no pending jobs exist', async () => {
      mockJobService.claimNextPendingJob.mockResolvedValue(null);

      const result = await orchestrator.run();

      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('🔍 Looking for pending jobs...');
      expect(mockLogger.info).toHaveBeenCalledWith('✅ No pending jobs found.');
    });

    it('should process a job successfully', async () => {
      const mockJob = createMockJob();
      const mockAnalysisResult = createMockAnalysisResult();

      mockJobService.claimNextPendingJob.mockResolvedValue(mockJob);
      mockAnalyzeDocument.mockResolvedValue(mockAnalysisResult);
      mockFetchJobCost.mockResolvedValue({ totalCostUSD: 0.5 });
      mockJobService.markAsCompleted.mockResolvedValue(mockJob);

      (prisma.evaluationVersion.findFirst as any).mockResolvedValue(null);
      (prisma.evaluationVersion.create as any).mockResolvedValue({ id: 'eval-version-1' });

      const result = await orchestrator.run();

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('✅ Job job-1 completed successfully');
      expect(mockJobService.markAsCompleted).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          llmThinking: 'Test thinking',
          priceInDollars: 0.5,
        })
      );
    });

    it('should handle job processing failure', async () => {
      const mockJob = createMockJob();
      const error = new Error('Analysis failed');

      mockJobService.claimNextPendingJob.mockResolvedValue(mockJob);
      mockAnalyzeDocument.mockRejectedValue(error);
      mockJobService.markAsFailed.mockResolvedValue(mockJob);

      await expect(orchestrator.run()).rejects.toThrow('Analysis failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ Job job-1 failed:',
        error
      );
      expect(mockJobService.markAsFailed).toHaveBeenCalledWith('job-1', error);
    });
  });

  describe('processJob', () => {
    it('should process job with session tracking', async () => {
      const mockJob = createMockJob();
      const mockAnalysisResult = createMockAnalysisResult();

      (prisma.job.findUnique as any).mockResolvedValue({ status: 'RUNNING' });
      mockAnalyzeDocument.mockResolvedValue(mockAnalysisResult);
      mockFetchJobCost.mockResolvedValue({ totalCostUSD: 0.75 });
      mockJobService.markAsCompleted.mockResolvedValue(mockJob);

      (prisma.evaluationVersion.findFirst as any).mockResolvedValue(null);
      (prisma.evaluationVersion.create as any).mockResolvedValue({ id: 'eval-version-1' });

      const result = await orchestrator.processJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.job).toBe(mockJob);
      expect(result.logContent).toContain('Job Execution Log');
      expect(result.logContent).toContain('job-1');
    });

    it('should handle missing document version', async () => {
      const mockJob = createMockJob();
      mockJob.evaluation.document.versions = [];

      (prisma.job.findUnique as any).mockResolvedValue({ status: 'RUNNING' });
      const result = await orchestrator.processJob(mockJob);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Document version not found');
    });

    it('should handle missing agent version', async () => {
      const mockJob = createMockJob();
      mockJob.evaluation.agent.versions = [];

      (prisma.job.findUnique as any).mockResolvedValue({ status: 'RUNNING' });
      const result = await orchestrator.processJob(mockJob);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Agent version not found');
    });

    it('should save highlights to database', async () => {
      const mockJob = createMockJob();
      const mockAnalysisResult = createMockAnalysisResult();
      
      (prisma.job.findUnique as any).mockResolvedValue({ status: 'RUNNING' });
      mockAnalysisResult.highlights = [
        {
          description: 'Test highlight',
          importance: 'high',
          grade: 'A',
          highlight: {
            startOffset: 0,
            endOffset: 10,
            quotedText: 'This is te',
          },
        },
      ];

      mockAnalyzeDocument.mockResolvedValue(mockAnalysisResult);
      mockFetchJobCost.mockResolvedValue(null);
      mockJobService.markAsCompleted.mockResolvedValue(mockJob);

      (prisma.evaluationVersion.findFirst as any).mockResolvedValue(null);
      (prisma.evaluationVersion.create as any).mockResolvedValue({ id: 'eval-version-1' });
      (prisma.evaluationComment.create as any).mockResolvedValue({ id: 'comment-1' });

      const result = await orchestrator.processJob(mockJob);

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Saved 1 highlights'),
        expect.objectContaining({
          evaluationId: 'eval-1',
          highlightCount: 1,
        })
      );
    });

    it('should handle cancelled job', async () => {
      const mockJob = createMockJob();
      
      (prisma.job.findUnique as any).mockResolvedValue({ status: 'CANCELLED' });
      
      const result = await orchestrator.processJob(mockJob);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Job was cancelled');
      expect(mockLogger.info).toHaveBeenCalledWith('Job job-1 was cancelled, skipping processing');
    });

    it('should calculate cost from tasks when Helicone unavailable', async () => {
      const mockJob = createMockJob();
      const mockAnalysisResult = createMockAnalysisResult();
      
      (prisma.job.findUnique as any).mockResolvedValue({ status: 'RUNNING' });
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
      mockFetchJobCost.mockResolvedValue(null);
      mockJobService.markAsCompleted.mockResolvedValue(mockJob);

      (prisma.evaluationVersion.findFirst as any).mockResolvedValue(null);
      (prisma.evaluationVersion.create as any).mockResolvedValue({ id: 'eval-version-1' });

      const result = await orchestrator.processJob(mockJob);

      expect(result.success).toBe(true);
      expect(mockJobService.markAsCompleted).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({
          priceInDollars: 0.6, // Sum of task costs
        })
      );
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
      grade: 'B',
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