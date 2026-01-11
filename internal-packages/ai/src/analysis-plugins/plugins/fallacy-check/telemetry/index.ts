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
  PIPELINE_STAGES,
} from './types';
