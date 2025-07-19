import { Opik, Dataset, flushAll, track } from 'opik';
import { Tool } from '../base/Tool';

/**
 * TypeScript-native Opik evaluation setup for tool quality tracking
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

export class OpikToolEvaluator {
  private opik: Opik;
  private tool: Tool;
  
  constructor(tool: Tool) {
    this.tool = tool;
    
    // Initialize Opik with API key from environment
    this.opik = new Opik({
      apiKey: process.env.OPIK_API_KEY,
      projectName: `tool-evals-${tool.config.id}`,
      // Opik cloud is default when API key is provided
    });
  }

  /**
   * Create or update evaluation dataset
   */
  async createDataset(
    name: string,
    dataPoints: EvaluationDataPoint[]
  ): Promise<string> {
    const dataset = await this.opik.datasets.createOrUpdate({
      name,
      description: `Evaluation dataset for ${this.tool.config.name}`,
      items: dataPoints.map((dp, index) => ({
        input: dp.input,
        expected_output: dp.expectedOutput,
        metadata: {
          ...dp.metadata,
          quality_score: dp.qualityScore,
          index,
          tool_version: this.tool.config.version
        }
      }))
    });
    
    return dataset.id;
  }

  /**
   * Run evaluation on current tool implementation
   */
  async evaluate(datasetId: string): Promise<EvaluationReport> {
    const dataset = await this.opik.datasets.get(datasetId);
    const results: EvaluationResult[] = [];
    
    // Create experiment
    const experiment = await this.opik.experiments.create({
      name: `${this.tool.config.id}-eval-${Date.now()}`,
      dataset_id: datasetId,
      metadata: {
        tool_version: this.tool.config.version,
        timestamp: new Date().toISOString()
      }
    });

    // Run tool on each input with tracing
    for (const item of dataset.items) {
      const trace = await this.opik.trace({
        name: `eval-${item.metadata?.index}`,
        input: item.input,
        metadata: {
          expected_output: item.expected_output
        }
      }, async (span) => {
        try {
          // Execute tool
          const actualOutput = await this.tool.execute(
            item.input,
            { logger: console as any }
          );
          
          // Calculate quality score
          const qualityScore = this.calculateQualityScore(
            actualOutput,
            item.expected_output
          );
          
          // Log to span
          span.update({
            output: actualOutput,
            scores: { quality: qualityScore },
            tags: ['evaluation', this.tool.config.category]
          });
          
          return {
            success: true,
            actualOutput,
            qualityScore
          };
        } catch (error) {
          span.update({
            output: { error: error.message },
            scores: { quality: 0 },
            tags: ['evaluation', 'error']
          });
          
          return {
            success: false,
            error: error.message,
            qualityScore: 0
          };
        }
      });

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

    // Log metrics to experiment
    await this.opik.experiments.logMetrics(experiment.id, {
      success_rate: report.successfulCases / report.totalCases,
      average_quality: report.averageQuality,
      total_cases: report.totalCases
    });

    // Log final summary
    await this.opik.logMessage({
      message: report.summary,
      tags: ['evaluation-summary'],
      metadata: {
        experiment_id: experiment.id,
        tool_id: this.tool.config.id
      }
    });

    return report;
  }

  /**
   * Simple quality scoring - override for custom logic
   */
  protected calculateQualityScore(actual: any, expected: any): number {
    if (!actual || !expected) return 0;
    
    // For objects, check key matches
    if (typeof actual === 'object' && typeof expected === 'object') {
      let score = 0;
      let checks = 0;
      
      for (const key in expected) {
        if (key in actual) {
          checks++;
          if (JSON.stringify(actual[key]) === JSON.stringify(expected[key])) {
            score++;
          }
        }
      }
      
      return checks > 0 ? score / checks : 0;
    }
    
    // Exact match for primitives
    return actual === expected ? 1.0 : 0.0;
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
   * Get Opik dashboard URL
   */
  getDashboardUrl(): string {
    // Opik Cloud URL structure
    const workspace = process.env.OPIK_WORKSPACE || 'default';
    return `https://www.comet.com/${workspace}/${this.opik.projectName}`;
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
 * Quick start helper with TypeScript SDK
 */
export async function quickEvaluateWithOpik(
  tool: Tool,
  testCases: Array<{ input: any; expectedOutput: any }>
): Promise<EvaluationReport> {
  const evaluator = new OpikToolEvaluator(tool);
  
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
  const report = await evaluator.evaluate(datasetId);
  
  // Print dashboard URL
  console.log(`\n🔗 View results in Opik dashboard:`);
  console.log(`   ${evaluator.getDashboardUrl()}`);
  
  return report;
}