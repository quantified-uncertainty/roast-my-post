/**
 * Job Orchestrator
 * 
 * Coordinates the complete job processing workflow.
 * Handles document analysis, evaluation creation, session management.
 * Now uses @roast/ai workflows directly instead of dependency injection.
 */

import type { JobWithRelations, JobRepository } from '@roast/db';
import { prisma, JobStatus } from '@roast/db';
import type { Logger, JobProcessingResult, Document } from '../types';
import {
  Agent,
  PluginType,
  HeliconeSessionManager,
  setGlobalSessionManager,
} from '@roast/ai';
import { analyzeDocument } from '@roast/ai/server';
import { JobService } from './JobService';

export interface JobOrchestratorInterface {
  processJob(job: JobWithRelations): Promise<JobProcessingResult>;
}

export class JobOrchestrator implements JobOrchestratorInterface {
  constructor(
    private jobRepository: JobRepository,
    private logger: Logger,
    private jobService: JobService
  ) {}

  /**
   * Process a complete job from start to finish
   */
  async processJob(job: JobWithRelations): Promise<JobProcessingResult> {
    this.logger.info(`[Job ${job.id}] Starting processing...`);
    const startTime = Date.now();
    let sessionManager: HeliconeSessionManager | undefined;

    try {
      // Check if job was cancelled before we start processing
      const currentJob = await prisma.job.findUnique({
        where: { id: job.id },
        select: { status: true }
      });
      
      if (currentJob?.status === 'CANCELLED') {
        this.logger.info(`[Job ${job.id}] Job was cancelled, skipping processing`);
        return {
          success: false,
          job: { ...job, status: 'CANCELLED' as any },
          error: new Error('Job was cancelled'),
        };
      }

      // Setup Helicone session tracking
      sessionManager = await this.setupSessionTracking(job);

      this.logger.info(`[Job ${job.id}] Preparing job data...`);
      // Extract and validate job data
      const { documentForAnalysis, agent } = this.prepareJobData(job);

      this.logger.info(`[Job ${job.id}] Executing analysis...`);
      // Execute document analysis using @roast/ai workflows
      const analysisResult = await this.executeAnalysis(
        documentForAnalysis, 
        agent, 
        job.id, 
        sessionManager
      );

      this.logger.info(`[Job ${job.id}] Saving analysis results...`);
      // Create evaluation version and save results
      await this.saveAnalysisResults(job, analysisResult, agent);

      // Calculate duration
      const durationInSeconds = (Date.now() - startTime) / 1000;

      this.logger.info(`[Job ${job.id}] Creating execution log...`);
      // Create execution log
      const logContent = this.createExecutionLog(
        job, 
        analysisResult, 
        durationInSeconds,
        startTime
      );

      this.logger.info(`[Job ${job.id}] Marking job as completed...`);
      // Mark job as completed
      const completedJob = await this.jobService.markAsCompleted(job.id, {
        llmThinking: analysisResult.thinking,
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
      this.logger.error(`[Job ${job.id}] processing failed:`, error);

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
      this.logger.warn(`[Job ${job.id}] ⚠️ Failed to create Helicone session manager:`, error);
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
    const documentForAnalysis: Document = {
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
      pluginIds: (agentVersion.pluginIds || []) as PluginType[], // Cast to PluginType[] since DB stores as strings
    };

    return { documentForAnalysis, agent, documentVersion, agentVersion };
  }

  /**
   * Execute the document analysis workflow
   */
  private async executeAnalysis(
    documentForAnalysis: Document, 
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

    // Save highlights to database
    const highlights = evaluationOutputs.highlights || [];
    if (highlights.length > 0) {
      // Use fullContent (which includes markdownPrepend) for validation
      // since highlights were generated based on the full content
      await this.saveHighlights(highlights, evaluationVersion.id, documentVersion.fullContent, job.id);
      this.logger.info(`[Job ${job.id}] Saved ${highlights.length} highlights for evaluation`, {
        evaluationId: job.evaluation.id,
        highlightCount: highlights.length,
      });
    }
  }

  /**
   * Save highlights with validation
   * 
   * Note: Highlights are linked to evaluations through comments (not directly).
   * This ensures every highlight has an associated comment for context.
   */
  private async saveHighlights(highlights: any[], evaluationVersionId: string, fullContent: string, jobId: string) {
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
            this.logger.warn(`[Job ${jobId}] Invalid highlight detected: ${error}`);
          }
        } catch (highlightError) {
          isValid = false;
          error = `Validation error: ${highlightError instanceof Error ? highlightError.message : String(highlightError)}`;
          this.logger.warn(`[Job ${jobId}] Highlight validation failed: ${error}`);
        }
      }

      // Only create highlight if we have highlight data
      if (!comment.highlight) {
        // Skip this comment if no highlight data
        this.logger.warn(`[Job ${jobId}] Skipping comment without highlight data: ${comment.description}`);
        continue;
      }

      // Create highlight with validation status
      const createdHighlight = await prisma.evaluationHighlight.create({
        data: {
          startOffset: comment.highlight.startOffset,
          endOffset: comment.highlight.endOffset,
          quotedText: comment.highlight.quotedText,
          prefix: comment.highlight.prefix || null,
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
          metadata: comment.metadata || null,
          evaluationVersionId,
          highlightId: createdHighlight.id,
        },
      });
    }
  }


  /**
   * Create a detailed execution log for the job
   */
  private createExecutionLog(
    job: JobWithRelations,
    analysisResult: any,
    durationInSeconds: number,
    startTime: number
  ): string {
    const documentVersion = job.evaluation.document.versions[0];
    const agentVersion = job.evaluation.agent.versions[0];
    
    const log = [
      `# Job Execution Log`,
      ``,
      `## Metadata`,
      `- Job ID: ${job.id}`,
      `- Evaluation ID: ${job.evaluation.id}`,
      `- Document: ${documentVersion.title}`,
      `- Agent: ${agentVersion.name} v${agentVersion.version}`,
      `- Started: ${new Date(startTime).toISOString()}`,
      `- Duration: ${durationInSeconds.toFixed(2)}s`,
      `- Status: SUCCESS`,
      ``,
      `## Analysis Summary`,
      `- Highlights generated: ${analysisResult.highlights?.length || 0}`,
      `- Grade: ${analysisResult.grade || 'N/A'}`,
      `- Self-critique: ${analysisResult.selfCritique ? 'Yes' : 'No'}`,
      ``,
      `## Task Breakdown`,
    ];

    if (analysisResult.tasks && analysisResult.tasks.length > 0) {
      for (const task of analysisResult.tasks) {
        log.push(`### ${task.name}`);
        log.push(`- Model: ${task.modelName}`);
        log.push(`- Duration: ${task.timeInSeconds.toFixed(2)}s`);
        log.push(`- Cost: $${task.priceInDollars.toFixed(4)}`);
        log.push(``);
      }
    }

    return log.join('\n');
  }
}
