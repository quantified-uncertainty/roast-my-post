/**
 * Pipeline Telemetry Module
 *
 * Exports telemetry types and collector for fallacy check pipeline observability.
 */

export { PipelineTelemetry } from './PipelineTelemetry';
export {
  type StageMetrics,
  type PipelineExecutionRecord,
  type PipelineStage,
  type FilteredItemRecord,
  type ExtractorTelemetry,
  type JudgeDecisionRecord,
  type ExtractionPhaseTelemetry,
  type ProfileInfo,
  type ActualApiParams,
  type ApiResponseMetrics,
  PIPELINE_STAGES,
} from './types';

// Re-export UnifiedUsageMetrics for consumers
export type { UnifiedUsageMetrics } from '../../../../utils/usageMetrics';
