/**
 * Job Orchestrator
 * 
 * Coordinates the complete job processing workflow.
 * Handles document analysis, evaluation creation, session management.
 * Orchestrates between JobService, document analysis, and external services.
 */

import type { JobWithRelations, JobEntity } from '@roast/db';
import { prisma } from '@roast/db';
import type { JobService } from './JobService';
import { Logger } from '@roast/domain';
import { 
  analyzeDocument,
} from '@/application/workflows/documentAnalysis';
import { Agent } from '@roast/ai';
import { ANALYSIS_MODEL } from '@roast/ai';
import {
  calculateApiCostInDollars,
  mapModelToCostModel,
} from '@/shared/utils/costCalculator';
import {
  HeliconeSessionManager,
  setGlobalSessionManager,
} from '@roast/ai';
import { fetchJobCostWithRetry } from '@roast/ai';

export interface JobOrchestratorInterface {
  processJob(job: JobWithRelations): Promise<JobProcessingResult>;
  run(): Promise<boolean>;
}

export interface JobProcessingResult {
  success: boolean;
  job: JobEntity;
  logFilename?: string;
  logContent?: string;
  error?: Error;
}

export class JobOrchestrator implements JobOrchestratorInterface {
  constructor(
    private jobService: JobService,
    private logger: Logger
  ) {}

  /**
   * Process a complete job from start to finish
   */
  async processJob(job: JobWithRelations): Promise<JobProcessingResult> {
    const startTime = Date.now();
    let sessionManager: HeliconeSessionManager | undefined;

    try {
      // Setup Helicone session tracking
      sessionManager = await this.setupSessionTracking(job);

      // Extract and validate job data
      const { documentForAnalysis, agent } = this.prepareJobData(job);

      // Execute document analysis
      const analysisResult = await this.executeAnalysis(
        documentForAnalysis, 
        agent, 
        job.id, 
        sessionManager
      );

      // Create evaluation version and save results
      await this.saveAnalysisResults(job, analysisResult, agent);

      // Calculate costs and duration
      const priceInDollars = await this.calculateJobCost(job.id, analysisResult.tasks);
      const durationInSeconds = (Date.now() - startTime) / 1000;

      // Create execution log
      const logContent = this.createExecutionLog(
        job, 
        analysisResult, 
        priceInDollars, 
        durationInSeconds,
        startTime
      );

      // Mark job as completed
      const completedJob = await this.jobService.markAsCompleted(job.id, {
        llmThinking: analysisResult.thinking,
        priceInDollars,
        durationInSeconds,
        logs: logContent,
      });

      return {
        success: true,
        job: completedJob,
        logFilename: `${new Date().toISOString().replace(/[:.]/g, '-')}-job-${job.id}.md`,
        logContent,
      };

    } catch (error) {
      this.logger.error(`Job ${job.id} processing failed:`, error);
      
      const failedJob = await this.jobService.markAsFailed(job.id, error);
      
      return {
        success: false,
        job: failedJob,
        error: error instanceof Error ? error : new Error(String(error)),
      };

    } finally {
      // Always clear session manager
      if (sessionManager) {
        setGlobalSessionManager(undefined);
      }
    }
  }

  /**
   * Find and process the next available job
   */
  async run(): Promise<boolean> {
    try {
      this.logger.info('🔍 Looking for pending jobs...');
      const job = await this.jobService.claimNextPendingJob();

      if (!job) {
        this.logger.info('✅ No pending jobs found.');
        return false;
      }

      const result = await this.processJob(job);
      
      if (result.success) {
        this.logger.info(`✅ Job ${job.id} completed successfully`);
      } else {
        this.logger.error(`❌ Job ${job.id} failed:`, result.error);
        throw result.error;
      }

      return true;
    } catch (error) {
      // Re-throw for caller to handle
      throw error;
    }
  }

  /**
   * Setup Helicone session tracking for the job
   */
  private async setupSessionTracking(job: JobWithRelations): Promise<HeliconeSessionManager | undefined> {
    try {
      const documentVersion = job.evaluation.document.versions[0];
      const agentVersion = job.evaluation.agent.versions[0];
      
      if (documentVersion && agentVersion) {
        // Use originalJobId for retries to group them under the same session
        const sessionId = job.originalJobId || job.id;
        const truncatedTitle = documentVersion.title.length > 50 
          ? documentVersion.title.slice(0, 50) + '...' 
          : documentVersion.title;
        
        const sessionManager = HeliconeSessionManager.forJob(
          sessionId,
          `${agentVersion.name} evaluating ${truncatedTitle}`,
          {
            JobId: job.id,
            JobAttempt: job.originalJobId ? 'retry' : 'initial',
            DocumentId: job.evaluation.document.id,
            AgentId: job.evaluation.agent.id,
            AgentVersion: agentVersion.version.toString(),
            EvaluationId: job.evaluation.id,
            UserId: job.evaluation.agent.submittedBy?.id || 'anonymous',
          }
        );
        
        // Set as global for automatic header propagation
        setGlobalSessionManager(sessionManager);
        return sessionManager;
      }
    } catch (error) {
      this.logger.warn('⚠️ Failed to create Helicone session manager:', error);
      // Continue without session tracking rather than failing the job
    }
    
    return undefined;
  }

  /**
   * Prepare document and agent data for analysis
   */
  private prepareJobData(job: JobWithRelations) {
    const documentVersion = job.evaluation.document.versions[0];
    const agentVersion = job.evaluation.agent.versions[0];

    if (!documentVersion) {
      throw new Error('Document version not found');
    }

    if (!agentVersion) {
      throw new Error('Agent version not found');
    }

    // Prepare document for analysis using Prisma's computed fullContent field
    const documentForAnalysis = {
      id: job.evaluation.document.id,
      slug: job.evaluation.document.id,
      title: documentVersion.title,
      content: documentVersion.fullContent, // Use computed field directly
      author: documentVersion.authors.join(', '),
      publishedDate: job.evaluation.document.publishedDate.toISOString(),
      url: documentVersion.urls[0] || '',
      platforms: documentVersion.platforms,
      reviews: [],
      intendedAgents: documentVersion.intendedAgents,
    };

    // Prepare agent info
    const agent: Agent = {
      id: job.evaluation.agent.id,
      name: agentVersion.name,
      version: agentVersion.version.toString(),
      description: agentVersion.description,
      primaryInstructions: agentVersion.primaryInstructions || undefined,
      selfCritiqueInstructions: agentVersion.selfCritiqueInstructions || undefined,
      providesGrades: agentVersion.providesGrades || false,
      extendedCapabilityId: agentVersion.extendedCapabilityId || undefined,
    };

    return { documentForAnalysis, agent, documentVersion, agentVersion };
  }

  /**
   * Execute the document analysis workflow
   */
  private async executeAnalysis(
    documentForAnalysis: any, 
    agent: Agent, 
    jobId: string, 
    sessionManager?: HeliconeSessionManager
  ) {
    // Track the analysis phase with session manager
    return await (sessionManager 
      ? sessionManager.trackAnalysis('document', async () => {
          return analyzeDocument(documentForAnalysis, agent, 500, 5, jobId);
        })
      : analyzeDocument(documentForAnalysis, agent, 500, 5, jobId));
  }

  /**
   * Save analysis results to database
   */
  private async saveAnalysisResults(job: JobWithRelations, analysisResult: any, agent: Agent) {
    const { tasks, ...evaluationOutputs } = analysisResult;

    // Get the latest version number for this evaluation
    const latestEvaluationVersion = await prisma.evaluationVersion.findFirst({
      where: { evaluationId: job.evaluation.id },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    
    const nextVersion = latestEvaluationVersion?.version 
      ? latestEvaluationVersion.version + 1 
      : 1;

    const documentVersion = job.evaluation.document.versions[0];
    const agentVersion = job.evaluation.agent.versions[0];

    // Create evaluation version
    const evaluationVersion = await prisma.evaluationVersion.create({
      data: {
        agentId: agent.id,
        version: nextVersion,
        summary: evaluationOutputs.summary,
        analysis: evaluationOutputs.analysis,
        grade: evaluationOutputs.grade,
        selfCritique: evaluationOutputs.selfCritique,
        agentVersionId: agentVersion.id,
        evaluationId: job.evaluation.id,
        documentVersionId: documentVersion.id,
        job: {
          connect: {
            id: job.id,
          },
        },
      },
    });

    // Save tasks to database
    for (const task of tasks) {
      await prisma.task.create({
        data: {
          name: task.name,
          modelName: task.modelName,
          priceInDollars: task.priceInDollars,
          timeInSeconds: task.timeInSeconds,
          log: task.log,
          jobId: job.id,
        },
      });
    }

    // Save highlights with validation
    await this.saveHighlights(evaluationOutputs.highlights, evaluationVersion.id, documentVersion.fullContent);

    return evaluationVersion;
  }

  /**
   * Save highlights with validation
   */
  private async saveHighlights(highlights: any[], evaluationVersionId: string, fullContent: string) {
    if (!highlights || highlights.length === 0) {
      return;
    }

    for (const comment of highlights) {
      // Validate highlight by checking if quotedText matches document at specified offsets
      let isValid = true;
      let error: string | null = null;
      
      if (!comment.highlight) {
        isValid = false;
        error = 'Highlight is missing';
      } else {
        try {
          const actualText = fullContent.slice(
            comment.highlight.startOffset, 
            comment.highlight.endOffset
          );
          
          if (actualText !== comment.highlight.quotedText) {
            isValid = false;
            error = `Text mismatch: expected "${comment.highlight.quotedText}" but found "${actualText}" at offsets ${comment.highlight.startOffset}-${comment.highlight.endOffset}`;
            this.logger.warn(`Invalid highlight detected: ${error}`);
          }
        } catch (highlightError) {
          isValid = false;
          error = `Validation error: ${highlightError instanceof Error ? highlightError.message : String(highlightError)}`;
          this.logger.warn(`Highlight validation failed: ${error}`);
        }
      }

      // Create highlight with validation status
      const createdHighlight = await prisma.evaluationHighlight.create({
        data: {
          startOffset: comment.highlight!.startOffset,
          endOffset: comment.highlight!.endOffset,
          quotedText: comment.highlight!.quotedText,
          prefix: comment.highlight!.prefix || null,
          isValid,
          error,
        },
      });

      // Create comment linked to highlight
      await prisma.evaluationComment.create({
        data: {
          description: comment.description || 'No description',
          importance: comment.importance || null,
          grade: comment.grade || null,
          header: comment.header || null,
          level: comment.level || null,
          source: comment.source || null,
          metadata: comment.metadata as any || null,
          evaluationVersionId,
          highlightId: createdHighlight.id,
        },
      });
    }
  }

  /**
   * Calculate job cost with Helicone fallback
   */
  private async calculateJobCost(jobId: string, tasks: any[]): Promise<number> {
    try {
      const heliconeData = await fetchJobCostWithRetry(jobId, 3, 1000);
      
      if (heliconeData) {
        this.logger.info(`Using Helicone cost data for job ${jobId}: $${heliconeData.totalCostUSD}`);
        return heliconeData.totalCostUSD;
      } else {
        throw new Error('Helicone data not available');
      }
    } catch (error) {
      // Fallback to manual cost calculation
      this.logger.warn(`Failed to fetch Helicone cost for job ${jobId}, falling back to manual calculation:`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      // Note: Token totals are tracked automatically by the Claude wrapper
      const totalInputTokens = 0; // Compatibility field, values tracked elsewhere
      const totalOutputTokens = 0; // Compatibility field, values tracked elsewhere
      
      return calculateApiCostInDollars(
        {
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
        },
        mapModelToCostModel(ANALYSIS_MODEL)
      );
    }
  }

  /**
   * Create detailed execution log
   */
  private createExecutionLog(
    job: JobWithRelations, 
    analysisResult: any, 
    priceInDollars: number, 
    durationInSeconds: number,
    startTime: number
  ): string {
    const documentVersion = job.evaluation.document.versions[0];
    const agentVersion = job.evaluation.agent.versions[0];
    const { tasks, ...evaluationOutputs } = analysisResult;

    // Include plugin logs if available
    const pluginLogsSection = analysisResult.jobLogString ? `

## Plugin Analysis Logs
${analysisResult.jobLogString}

---

` : '';

    return `# Job Execution Log ${new Date().toISOString()}
    
## Document Information
- ID: ${job.evaluation.document.id}
- Title: ${documentVersion.title}
- Authors: ${documentVersion.authors.join(', ')}

## Agent Information
- ID: ${job.evaluation.agent.id}
- Name: ${agentVersion.name}

## Summary Statistics
- Total Tokens: 0 (tracked automatically by Claude wrapper)
- Estimated Cost: $${priceInDollars.toFixed(6)}
- Runtime: ${durationInSeconds.toFixed(2)}s
- Status: Success
${pluginLogsSection}
## LLM Thinking
\`\`\`
${evaluationOutputs.thinking || 'No thinking provided'}
\`\`\`

## Tasks
${tasks
  .map(
    (task: any) => `
### ${task.name}
- Model: ${task.modelName}
- Time: ${task.timeInSeconds}s
- Cost: $${task.priceInDollars.toFixed(6)}
- Note: LLM interactions now tracked automatically by Claude wrapper
`
  )
  .join('\n')}

## Response
\`\`\`json
${JSON.stringify(evaluationOutputs, null, 2)}
\`\`\`
`;
  }
}