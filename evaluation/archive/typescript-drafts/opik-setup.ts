import Opik from 'opik';
import { Tool } from '../base/Tool';

/**
 * Simple Opik evaluation setup for tool quality tracking
 * 
 * This provides:
 * 1. Dataset management for input/output pairs
 * 2. Quality scoring and tracking over time
 * 3. Easy interface for Claude Code to iterate on improvements
 */

export interface EvaluationDataPoint {
  input: any;
  expectedOutput: any;
  actualOutput?: any;
  qualityScore?: number; // 0-1 scale
  timestamp?: Date;
  metadata?: {
    toolVersion?: string;
    evaluatorNotes?: string;
    tags?: string[];
  };
}

export class ToolEvaluator {
  private opik: typeof Opik;
  private tool: Tool;
  
  constructor(tool: Tool) {
    this.tool = tool;
    this.opik = new Opik({
      apiKey: process.env.OPIK_API_KEY,
      projectName: `tool-evals-${tool.config.id}`,
      // Use local deployment for quick setup
      workspace: process.env.OPIK_WORKSPACE || 'local'
    });
  }

  /**
   * Create or update evaluation dataset
   */
  async createDataset(
    name: string,
    dataPoints: EvaluationDataPoint[]
  ): Promise<string> {
    const dataset = await this.opik.datasets.create_or_update(
      name,
      dataPoints.map((dp, index) => ({
        input: dp.input,
        expected_output: dp.expectedOutput,
        metadata: {
          ...dp.metadata,
          quality_score: dp.qualityScore,
          index
        }
      }))
    );
    
    return dataset.id;
  }

  /**
   * Run evaluation on current tool implementation
   */
  async evaluate(datasetId: string): Promise<EvaluationReport> {
    const dataset = await this.opik.datasets.get(datasetId);
    const results: EvaluationResult[] = [];
    
    // Create experiment run
    const experiment = await this.opik.experiments.create({
      name: `${this.tool.config.id}-eval-${Date.now()}`,
      dataset_id: datasetId,
      metadata: {
        tool_version: this.tool.config.version,
        timestamp: new Date().toISOString()
      }
    });

    // Run tool on each input
    for (const item of dataset.items) {
      const trace = await this.opik.trace(
        `eval-${item.index}`,
        async () => {
          try {
            const actualOutput = await this.tool.execute(
              item.input,
              { logger: console as any }
            );
            
            // Simple quality scoring - could be enhanced
            const qualityScore = this.calculateQualityScore(
              actualOutput,
              item.expected_output
            );
            
            return {
              success: true,
              actualOutput,
              qualityScore
            };
          } catch (error) {
            return {
              success: false,
              error: error.message,
              qualityScore: 0
            };
          }
        }
      );

      results.push({
        input: item.input,
        expectedOutput: item.expected_output,
        actualOutput: trace.output?.actualOutput,
        qualityScore: trace.output?.qualityScore || 0,
        success: trace.output?.success || false,
        error: trace.output?.error,
        traceId: trace.id
      });
    }

    // Calculate aggregate metrics
    const report: EvaluationReport = {
      experimentId: experiment.id,
      timestamp: new Date(),
      toolVersion: this.tool.config.version,
      totalCases: results.length,
      successfulCases: results.filter(r => r.success).length,
      averageQuality: results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length,
      results,
      summary: this.generateSummary(results)
    };

    // Log to Opik
    await this.opik.experiments.log_metrics(experiment.id, {
      success_rate: report.successfulCases / report.totalCases,
      average_quality: report.averageQuality
    });

    return report;
  }

  /**
   * Simple quality scoring - override for custom logic
   */
  protected calculateQualityScore(actual: any, expected: any): number {
    // Basic implementation - exact match = 1, no match = 0
    // In practice, you'd want more sophisticated scoring
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      return 1.0;
    }
    
    // Partial credit for partial matches
    // This is where you could integrate your existing fuzzy matching
    return 0.0;
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(results: EvaluationResult[]): string {
    const failures = results.filter(r => !r.success);
    const lowQuality = results.filter(r => r.qualityScore < 0.5);
    
    let summary = `Evaluated ${results.length} test cases:\n`;
    summary += `- Success rate: ${((results.filter(r => r.success).length / results.length) * 100).toFixed(1)}%\n`;
    summary += `- Average quality: ${(results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length).toFixed(2)}\n`;
    
    if (failures.length > 0) {
      summary += `\nFailures (${failures.length}):\n`;
      failures.slice(0, 3).forEach(f => {
        summary += `  - Input: ${JSON.stringify(f.input).slice(0, 50)}... Error: ${f.error}\n`;
      });
    }
    
    if (lowQuality.length > 0) {
      summary += `\nLow quality outputs (${lowQuality.length}):\n`;
      lowQuality.slice(0, 3).forEach(lq => {
        summary += `  - Score: ${lq.qualityScore.toFixed(2)} for input: ${JSON.stringify(lq.input).slice(0, 50)}...\n`;
      });
    }
    
    return summary;
  }

  /**
   * Get evaluation history for tracking improvements
   */
  async getEvaluationHistory(limit: number = 10): Promise<EvaluationReport[]> {
    const experiments = await this.opik.experiments.list({
      project_name: `tool-evals-${this.tool.config.id}`,
      limit
    });
    
    // Fetch full reports for each experiment
    const reports: EvaluationReport[] = [];
    for (const exp of experiments) {
      // In practice, you'd store/retrieve full reports
      reports.push({
        experimentId: exp.id,
        timestamp: new Date(exp.created_at),
        toolVersion: exp.metadata?.tool_version || 'unknown',
        totalCases: exp.metadata?.total_cases || 0,
        successfulCases: exp.metadata?.successful_cases || 0,
        averageQuality: exp.metrics?.average_quality || 0,
        results: [], // Would fetch from storage
        summary: exp.metadata?.summary || ''
      });
    }
    
    return reports;
  }
}

// Types
export interface EvaluationResult {
  input: any;
  expectedOutput: any;
  actualOutput?: any;
  qualityScore: number;
  success: boolean;
  error?: string;
  traceId: string;
}

export interface EvaluationReport {
  experimentId: string;
  timestamp: Date;
  toolVersion: string;
  totalCases: number;
  successfulCases: number;
  averageQuality: number;
  results: EvaluationResult[];
  summary: string;
}

/**
 * Quick start helper
 */
export async function quickEvaluate(
  tool: Tool,
  testCases: Array<{ input: any; expectedOutput: any }>
): Promise<EvaluationReport> {
  const evaluator = new ToolEvaluator(tool);
  
  // Create dataset
  const datasetId = await evaluator.createDataset(
    `${tool.config.id}-quicktest-${Date.now()}`,
    testCases.map(tc => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      qualityScore: 1.0 // Assume perfect for expected outputs
    }))
  );
  
  // Run evaluation
  return evaluator.evaluate(datasetId);
}