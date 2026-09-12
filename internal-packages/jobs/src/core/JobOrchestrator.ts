/**
 * Job Orchestrator
 * 
 * Coordinates the complete job processing workflow.
 * Handles document analysis and evaluation creation.
 * Now uses @roast/ai workflows directly instead of dependency injection.
 */

import type { JobWithRelations, JobRepository } from '@roast/db';
import { prisma, JobStatus } from '@roast/db';
import type { Logger, JobProcessingResult, Document } from '../types';
import { Agent, PluginType, Comment } from '@roast/ai';
import { analyzeDocument, getWorkerId, DocumentAnalysisResult } from '@roast/ai/server';
import { JobService } from './JobService';

export interface JobProcessingOptions {
  /** Profile ID for plugin configuration (e.g., FallacyCheckPlugin) */
  profileId?: string;
}

export interface JobOrchestratorInterface {
  processJob(job: JobWithRelations, options?: JobProcessingOptions): Promise<JobProcessingResult>;
}

export class JobOrchestrator implements JobOrchestratorInterface {
  constructor(
    private jobRepository: JobRepository,
    private logger: Logger,
    private jobService: JobService
  ) {}

  private formatLog(jobId: string, message: string): string {
    const workerId = getWorkerId();
    const workerPrefix = workerId ? `[Worker ${workerId}] ` : '';
    return `${workerPrefix}[Job ${jobId}] ${message}`;
  }

  /**
   * Process a complete job from start to finish
   */
  async processJob(job: JobWithRelations, options?: JobProcessingOptions): Promise<JobProcessingResult> {
    this.logger.info(this.formatLog(job.id, `Starting processing...${options?.profileId ? ` (profile: ${options.profileId})` : ''}`));
    const startTime = Date.now();
    try {
      // Check if job was cancelled before we start processing
      const currentJob = await this.jobRepository.findById(job.id);

      if (currentJob?.status === JobStatus.CANCELLED) {
        this.logger.info(this.formatLog(job.id, 'Job was cancelled, skipping processing'));
        return {
          success: false,
          job: { ...job, status: JobStatus.CANCELLED },
          error: new Error('Job was cancelled'),
        };
      }

      this.logger.info(this.formatLog(job.id, 'Preparing job data...'));
      // Extract and validate job data
      const { documentForAnalysis, agent } = this.prepareJobData(job);

      this.logger.info(this.formatLog(job.id, 'Executing analysis...'));
      // Execute document analysis using @roast/ai workflows
      const analysisResult = await this.executeAnalysis(
        documentForAnalysis,
        agent,
        job.id,
        options?.profileId
      );

      this.logger.info(this.formatLog(job.id, 'Saving analysis results...'));
      // Create evaluation version and save results
      await this.saveAnalysisResults(job, analysisResult, agent);

      // Calculate duration
      const durationInSeconds = (Date.now() - startTime) / 1000;

      this.logger.info(this.formatLog(job.id, 'Creating execution log...'));
      // Create execution log
      const logContent = this.createExecutionLog(
        job, 
        analysisResult, 
        durationInSeconds,
        startTime
      );

      this.logger.info(this.formatLog(job.id, 'Marking job as completed...'));
      // Mark job as completed
      const completedJob = await this.jobService.markAsCompleted(job.id, {
        llmThinking: analysisResult.thinking,
        durationInSeconds,
        logs: logContent,
        priceInDollars: analysisResult.tasks.reduce(
          (total, task) => total + task.priceInDollars,
          0
        ),
      });

      return {
        success: true,
        job: completedJob,
        logFilename: `${new Date().toISOString().replace(/[:.]/g, '-')}-job-${job.id}.md`,
        logContent,
      };

    } catch (error) {
      this.logger.error(this.formatLog(job.id, 'processing failed:'), error);

      const failedJob = await this.jobService.markAsFailed(job.id, error);
      
      return {
        success: false,
        job: failedJob,
        error: error instanceof Error ? error : new Error(String(error)),
      };

    }
  }

  /**
   * Prepare document and agent data for analysis
   */
  private prepareJobData(job: JobWithRelations) {
    // TypeScript types guarantee these are defined (Prisma include with take: 1)
    const documentVersion = job.evaluation.document.versions[0];
    const agentVersion = job.evaluation.agent.versions[0];

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
      pluginIds: agentVersion.pluginIds as PluginType[], // Cast to PluginType[] since DB stores as strings
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
    profileId?: string
  ) {
    // Callback for incremental telemetry persistence to Job.telemetryProgress
    const onTelemetryUpdate = async (telemetry: Record<string, unknown>) => {
      try {
        await prisma.job.update({
          where: { id: jobId },
          data: { telemetryProgress: telemetry as object },
        });
      } catch (err) {
        // Don't let telemetry persistence errors break the analysis
        this.logger.warn(this.formatLog(jobId, `Failed to persist telemetry progress: ${err instanceof Error ? err.message : String(err)}`));
      }
    };

    // Use options-based signature to pass profileId
    const analysisOptions = {
      targetWordCount: 500,
      targetHighlights: 5,
      jobId,
      fallacyCheckProfileId: profileId,
      onTelemetryUpdate,
    };

    return analyzeDocument(documentForAnalysis, agent, analysisOptions);
  }

  /**
   * Save analysis results to database
   */
  private async saveAnalysisResults(job: JobWithRelations, analysisResult: DocumentAnalysisResult, agent: Agent) {
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
        pipelineTelemetry: evaluationOutputs.pipelineTelemetry ?? undefined,
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
    const highlights = evaluationOutputs.highlights;
    if (highlights.length > 0) {
      // Use fullContent (which includes markdownPrepend) for validation
      // since highlights were generated based on the full content
      await this.saveHighlights(highlights, evaluationVersion.id, documentVersion.fullContent, job.id);
      this.logger.info(this.formatLog(job.id, `Saved ${highlights.length} highlights for evaluation ${job.evaluation.id}`));
    }
  }

  /**
   * Save highlights with validation
   *
   * Note: Highlights are linked to evaluations through comments (not directly).
   * This ensures every highlight has an associated comment for context.
   */
  private async saveHighlights(highlights: Comment[], evaluationVersionId: string, fullContent: string, jobId: string) {
    if (highlights.length === 0) {
      return;
    }

    for (const comment of highlights) {
      // Validate highlight by checking if quotedText matches document at specified offsets
      let isValid = true;
      let error: string | null = null;

      try {
        const actualText = fullContent.slice(
          comment.highlight.startOffset,
          comment.highlight.endOffset
        );

        if (actualText !== comment.highlight.quotedText) {
          isValid = false;
          error = `Text mismatch: expected "${comment.highlight.quotedText}" but found "${actualText}" at offsets ${comment.highlight.startOffset}-${comment.highlight.endOffset}`;
          this.logger.warn(this.formatLog(jobId, `Invalid highlight detected: ${error}`));
        }
      } catch (highlightError) {
        isValid = false;
        error = `Validation error: ${highlightError instanceof Error ? highlightError.message : String(highlightError)}`;
        this.logger.warn(this.formatLog(jobId, `Highlight validation failed: ${error}`));
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
          importance: comment.importance ?? null,
          grade: comment.grade ?? null,
          header: comment.header ?? null,
          level: comment.level ?? null,
          source: comment.source ?? null,
          metadata: comment.metadata ?? undefined,
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
    analysisResult: DocumentAnalysisResult,
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
      `- Highlights generated: ${analysisResult.highlights.length}`,
      `- Grade: ${analysisResult.grade || 'N/A'}`,
      `- Self-critique: ${analysisResult.selfCritique ? 'Yes' : 'No'}`,
      ``,
      `## Task Breakdown`,
    ];

    if (analysisResult.tasks.length > 0) {
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
