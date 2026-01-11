/**
 * Pipeline Telemetry Collector
 *
 * Collects and aggregates metrics during fallacy check pipeline execution.
 * Provides a fluent API for tracking stages and finalizing results.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  StageMetrics,
  PipelineExecutionRecord,
  PipelineStage,
  FilteredItemRecord,
  ExtractionPhaseTelemetry,
} from './types';

/** Current pipeline version - increment when making significant changes */
const PIPELINE_VERSION = '2.0.0'; // v2: single-pass extraction + supported-elsewhere filter

/**
 * Tracks metrics for an in-progress stage
 */
interface ActiveStage {
  stageName: string;
  startTime: number;
  inputCount: number;
  model?: string;
}

/**
 * Pipeline Telemetry Collector
 *
 * Usage:
 * ```ts
 * const telemetry = new PipelineTelemetry(documentText.length);
 *
 * telemetry.startStage('extraction', 1);
 * const issues = await extract();
 * telemetry.endStage(issues.length);
 *
 * telemetry.startStage('filter', issues.length);
 * const filtered = await filter(issues);
 * telemetry.endStage(filtered.length);
 *
 * const record = telemetry.finalize(true);
 * ```
 */
export class PipelineTelemetry {
  private executionId: string;
  private startedAt: Date;
  private documentLength: number;
  private stages: StageMetrics[] = [];
  private activeStage: ActiveStage | null = null;
  private filteredItems: FilteredItemRecord[] = [];
  private extractionPhase: ExtractionPhaseTelemetry | null = null;
  private finalCounts: PipelineExecutionRecord['finalCounts'] = {
    issuesExtracted: 0,
    issuesAfterDedup: 0,
    issuesAfterFiltering: 0,
    commentsGenerated: 0,
    commentsKept: 0,
  };

  constructor(documentLength: number) {
    this.executionId = uuidv4();
    this.startedAt = new Date();
    this.documentLength = documentLength;
  }

  /**
   * Start tracking a new pipeline stage
   */
  startStage(
    stageName: PipelineStage | string,
    inputCount: number,
    options?: { model?: string }
  ): this {
    // If there's an active stage that wasn't ended, end it with error
    if (this.activeStage) {
      console.warn(
        `[PipelineTelemetry] Stage '${this.activeStage.stageName}' was not properly ended. Ending with error.`
      );
      this.endStage(0, { error: 'Stage was not properly ended' });
    }

    this.activeStage = {
      stageName,
      startTime: Date.now(),
      inputCount,
      model: options?.model,
    };

    return this;
  }

  /**
   * End the current stage and record metrics
   */
  endStage(
    outputCount: number,
    options?: {
      costUsd?: number;
      error?: string;
      metadata?: Record<string, unknown>;
    }
  ): this {
    if (!this.activeStage) {
      console.warn(
        '[PipelineTelemetry] endStage called without an active stage'
      );
      return this;
    }

    const durationMs = Date.now() - this.activeStage.startTime;
    const filteredCount = this.activeStage.inputCount - outputCount;

    const metrics: StageMetrics = {
      stageName: this.activeStage.stageName,
      durationMs,
      inputCount: this.activeStage.inputCount,
      outputCount,
      filteredCount: Math.max(0, filteredCount), // Don't report negative if output > input
      model: this.activeStage.model,
      costUsd: options?.costUsd,
      error: options?.error,
      metadata: options?.metadata,
    };

    this.stages.push(metrics);
    this.activeStage = null;

    return this;
  }

  /**
   * Record a stage that already completed (for stages we can't wrap)
   */
  recordStage(
    stageName: PipelineStage | string,
    metrics: Omit<StageMetrics, 'stageName'>
  ): this {
    this.stages.push({
      stageName,
      ...metrics,
    });
    return this;
  }

  /**
   * Update final counts (call after each major phase)
   */
  setFinalCounts(
    counts: Partial<PipelineExecutionRecord['finalCounts']>
  ): this {
    this.finalCounts = {
      ...this.finalCounts,
      ...counts,
    };
    return this;
  }

  /**
   * Record a filtered item with its reasoning
   */
  recordFilteredItem(item: FilteredItemRecord): this {
    this.filteredItems.push(item);
    return this;
  }

  /**
   * Record multiple filtered items
   */
  recordFilteredItems(items: FilteredItemRecord[]): this {
    this.filteredItems.push(...items);
    return this;
  }

  /**
   * Set extraction phase telemetry (for multi-extractor mode)
   */
  setExtractionPhase(telemetry: ExtractionPhaseTelemetry): this {
    this.extractionPhase = telemetry;
    return this;
  }

  /**
   * Calculate total cost from all stages
   */
  private calculateTotalCost(): number | undefined {
    const costs = this.stages
      .map((s) => s.costUsd)
      .filter((c): c is number => c !== undefined);

    if (costs.length === 0) return undefined;
    return costs.reduce((sum, cost) => sum + cost, 0);
  }

  /**
   * Finalize and return the complete execution record
   */
  finalize(success: boolean, error?: string): PipelineExecutionRecord {
    // End any active stage
    if (this.activeStage) {
      this.endStage(0, { error: error || 'Pipeline ended with active stage' });
    }

    const completedAt = new Date();
    const totalDurationMs = completedAt.getTime() - this.startedAt.getTime();

    return {
      executionId: this.executionId,
      startedAt: this.startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      totalDurationMs,
      documentLength: this.documentLength,
      stages: this.stages,
      finalCounts: this.finalCounts,
      success,
      error,
      totalCostUsd: this.calculateTotalCost(),
      pipelineVersion: PIPELINE_VERSION,
      filteredItems: this.filteredItems, // Always include (even if empty) so we know telemetry was captured
      extractionPhase: this.extractionPhase || undefined,
    };
  }

  /**
   * Get execution ID for correlation
   */
  getExecutionId(): string {
    return this.executionId;
  }

  /**
   * Log a summary of the current telemetry state
   */
  logSummary(): void {
    console.log('\n========== PIPELINE TELEMETRY SUMMARY ==========');
    console.log(`Execution ID: ${this.executionId}`);
    console.log(`Document length: ${this.documentLength} chars`);
    console.log(`\nStages completed: ${this.stages.length}`);

    for (const stage of this.stages) {
      const status = stage.error ? '❌' : '✅';
      console.log(`  ${status} ${stage.stageName}:`);
      console.log(`      Duration: ${stage.durationMs}ms`);
      console.log(`      In: ${stage.inputCount} → Out: ${stage.outputCount} (filtered: ${stage.filteredCount})`);
      if (stage.model) {
        console.log(`      Model: ${stage.model}`);
      }
      if (stage.costUsd !== undefined) {
        console.log(`      Cost: $${stage.costUsd.toFixed(4)}`);
      }
      if (stage.error) {
        console.log(`      Error: ${stage.error}`);
      }
    }

    console.log('\nFinal counts:');
    console.log(`  Issues extracted: ${this.finalCounts.issuesExtracted}`);
    console.log(`  After dedup: ${this.finalCounts.issuesAfterDedup}`);
    console.log(`  After filtering: ${this.finalCounts.issuesAfterFiltering}`);
    console.log(`  Comments generated: ${this.finalCounts.commentsGenerated}`);
    console.log(`  Comments kept: ${this.finalCounts.commentsKept}`);

    const totalCost = this.calculateTotalCost();
    if (totalCost !== undefined) {
      console.log(`\nTotal cost: $${totalCost.toFixed(4)}`);
    }

    const elapsed = Date.now() - this.startedAt.getTime();
    console.log(`Total elapsed: ${elapsed}ms`);
    console.log('================================================\n');
  }
}
