import { JobOrchestrator } from '../JobOrchestrator';
import { JobService } from '../JobService';
import { analyzeDocument } from '@roast/ai';
import { prisma } from '@roast/db';
import { fetchJobCostWithRetry } from '@roast/ai';
import type { Logger } from '../types';

// Mock dependencies
jest.mock('@roast/ai', () => ({
  analyzeDocument: jest.fn(),
  initializeAI: jest.fn(),
  HeliconeSessionManager: {
    forJob: jest.fn(() => ({
      trackAnalysis: jest.fn((type, fn) => fn()),
    })),
  },
  setGlobalSessionManager: jest.fn(),
  fetchJobCostWithRetry: jest.fn(),
}));

jest.mock('@roast/db', () => ({
  prisma: {
    evaluationVersion: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    task: {
      create: jest.fn(),
    },
    evaluationComment: {
      create: jest.fn(),
    },
    $disconnect: jest.fn(),
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
  let mockJobService: jest.Mocked<JobService>;
  let mockLogger: jest.Mocked<Logger>;
  let mockAnalyzeDocument: jest.MockedFunction<typeof analyzeDocument>;
  let mockFetchJobCost: jest.MockedFunction<typeof fetchJobCostWithRetry>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Create mock job service
    mockJobService = {
      claimNextPendingJob: jest.fn(),
      markAsRunning: jest.fn(),
      markAsCompleted: jest.fn(),
      markAsFailed: jest.fn(),
      createRetryJob: jest.fn(),
      getJobWithRelations: jest.fn(),
    } as any;

    mockAnalyzeDocument = analyzeDocument as jest.MockedFunction<typeof analyzeDocument>;
    mockFetchJobCost = fetchJobCostWithRetry as jest.MockedFunction<typeof fetchJobCostWithRetry>;

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

      (prisma.evaluationVersion.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.evaluationVersion.create as jest.Mock).mockResolvedValue({ id: 'eval-version-1' });

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

      mockAnalyzeDocument.mockResolvedValue(mockAnalysisResult);
      mockFetchJobCost.mockResolvedValue({ totalCostUSD: 0.75 });
      mockJobService.markAsCompleted.mockResolvedValue(mockJob);

      (prisma.evaluationVersion.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.evaluationVersion.create as jest.Mock).mockResolvedValue({ id: 'eval-version-1' });

      const result = await orchestrator.processJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.job).toBe(mockJob);
      expect(result.logContent).toContain('Job Execution Log');
      expect(result.logContent).toContain('job-1');
    });

    it('should handle missing document version', async () => {
      const mockJob = createMockJob();
      mockJob.evaluation.document.versions = [];

      const result = await orchestrator.processJob(mockJob);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Document version not found');
    });

    it('should handle missing agent version', async () => {
      const mockJob = createMockJob();
      mockJob.evaluation.agent.versions = [];

      const result = await orchestrator.processJob(mockJob);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Agent version not found');
    });

    it('should save highlights to database', async () => {
      const mockJob = createMockJob();
      const mockAnalysisResult = createMockAnalysisResult();
      mockAnalysisResult.highlights = [
        {
          description: 'Test highlight',
          importance: 'high',
          grade: 'A',
          highlight: {
            startOffset: 0,
            endOffset: 10,
            quotedText: 'Test text',
          },
        },
      ];

      mockAnalyzeDocument.mockResolvedValue(mockAnalysisResult);
      mockFetchJobCost.mockResolvedValue(null);
      mockJobService.markAsCompleted.mockResolvedValue(mockJob);

      (prisma.evaluationVersion.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.evaluationVersion.create as jest.Mock).mockResolvedValue({ id: 'eval-version-1' });

      const result = await orchestrator.processJob(mockJob);

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Generated 1 highlights'),
        expect.objectContaining({
          evaluationId: 'eval-1',
          highlightCount: 1,
        })
      );
    });

    it('should calculate cost from tasks when Helicone unavailable', async () => {
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
      mockFetchJobCost.mockResolvedValue(null);
      mockJobService.markAsCompleted.mockResolvedValue(mockJob);

      (prisma.evaluationVersion.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.evaluationVersion.create as jest.Mock).mockResolvedValue({ id: 'eval-version-1' });

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
      originalJobId: null,
      attempts: 1,
      evaluation: {
        id: 'eval-1',
        document: {
          id: 'doc-1',
          publishedDate: new Date('2024-01-01'),
          versions: [
            {
              id: 'doc-version-1',
              title: 'Test Document',
              fullContent: 'This is test content',
              authors: ['Test Author'],
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
    };
  }

  function createMockAnalysisResult() {
    return {
      summary: 'Test summary',
      analysis: 'Test analysis',
      grade: 'B',
      selfCritique: null,
      highlights: [],
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