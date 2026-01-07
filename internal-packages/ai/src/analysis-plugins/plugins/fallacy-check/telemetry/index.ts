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
  PIPELINE_STAGES,
} from './types';
