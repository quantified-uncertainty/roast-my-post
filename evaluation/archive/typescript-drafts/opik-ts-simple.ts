import { Opik, track, flushAll } from 'opik';
import { Tool } from '../base/Tool';

/**
 * Simplified Opik integration using the tracing API
 * Since the TypeScript SDK doesn't have full evaluation API yet,
 * we'll use traces to track tool performance
 */

export interface TestCase {
  name: string;
  input: any;
  expectedOutput: any;
}

export interface TestResult {
  testCase: string;
  input: any;
  expectedOutput: any;
  actualOutput: any;
  success: boolean;
  qualityScore: number;
  error?: string;
  traceUrl?: string;
}

export class OpikToolTracker {
  private opik: Opik;
  private tool: Tool;
  private projectName: string;
  
  constructor(tool: Tool) {
    this.tool = tool;
    this.projectName = `tool-evals-${tool.config.id}`;
    
    // Initialize Opik client
    this.opik = new Opik({
      apiKey: process.env.OPIK_API_KEY!,
      projectName: this.projectName,
    });
  }

  /**
   * Run evaluation using traces
   */
  async evaluate(testCases: TestCase[]): Promise<{
    results: TestResult[];
    summary: {
      totalTests: number;
      passed: number;
      averageScore: number;
    };
    dashboardUrl: string;
  }> {
    const results: TestResult[] = [];
    const experimentId = `eval-${Date.now()}`;
    
    console.log(`🧪 Running ${testCases.length} test cases...\n`);
    
    for (const testCase of testCases) {
      // Create a trace for each test case
      const trace = await this.opik.trace({
        name: `${this.tool.config.id}-eval`,
        input: testCase.input,
        metadata: {
          experimentId,
          testCaseName: testCase.name,
          expectedOutput: testCase.expectedOutput,
          toolVersion: this.tool.config.version
        },
        tags: ['evaluation', this.tool.config.category, experimentId]
      });
      
      try {
        // Execute the tool
        const actualOutput = await this.tool.execute(
          testCase.input,
          { logger: console as any }
        );
        
        // Calculate quality score
        const qualityScore = this.calculateQualityScore(
          actualOutput,
          testCase.expectedOutput
        );
        
        // Update trace with results
        trace.update({
          output: actualOutput,
          metadata: {
            ...trace.metadata,
            qualityScore,
            success: true
          },
          tags: [...(trace.tags || []), qualityScore >= 0.7 ? 'passed' : 'failed']
        });
        
        results.push({
          testCase: testCase.name,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput,
          success: true,
          qualityScore,
          traceUrl: `https://www.comet.com/opik/${this.projectName}/traces/${trace.id}`
        });
        
        console.log(`✅ ${testCase.name}: Score ${qualityScore.toFixed(2)}`);
        
      } catch (error) {
        // Log error in trace
        trace.update({
          output: { error: error.message },
          metadata: {
            ...trace.metadata,
            qualityScore: 0,
            success: false,
            error: error.message
          },
          tags: [...(trace.tags || []), 'error', 'failed']
        });
        
        results.push({
          testCase: testCase.name,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: null,
          success: false,
          qualityScore: 0,
          error: error.message
        });
        
        console.log(`❌ ${testCase.name}: ${error.message}`);
      }
      
      // End the trace
      await trace.end();
    }
    
    // Ensure all traces are sent
    await this.opik.flush();
    
    // Calculate summary
    const passed = results.filter(r => r.qualityScore >= 0.5).length;
    const averageScore = results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length;
    
    const summary = {
      totalTests: results.length,
      passed,
      averageScore
    };
    
    // Log summary as a separate trace
    const summaryTrace = await this.opik.trace({
      name: `${this.tool.config.id}-eval-summary`,
      input: { experimentId, testCount: results.length },
      output: summary,
      metadata: {
        experimentId,
        toolVersion: this.tool.config.version,
        timestamp: new Date().toISOString()
      },
      tags: ['evaluation-summary', experimentId]
    });
    await summaryTrace.end();
    await this.opik.flush();
    
    return {
      results,
      summary,
      dashboardUrl: this.getDashboardUrl()
    };
  }

  /**
   * Calculate quality score for forecaster outputs
   */
  protected calculateQualityScore(actual: any, expected: any): number {
    if (!actual || !expected) return 0;
    
    let score = 0;
    let factors = 0;
    
    // Check probability is within range
    if (actual.probability !== undefined && expected.probabilityRange) {
      const [min, max] = expected.probabilityRange;
      if (actual.probability >= min && actual.probability <= max) {
        score += 1.0;
      } else {
        const distance = Math.min(
          Math.abs(actual.probability - min),
          Math.abs(actual.probability - max)
        );
        if (distance <= 10) {
          score += 0.5;
        }
      }
      factors++;
    }
    
    // Check consensus
    if (actual.consensus && expected.consensus) {
      if (expected.consensus.includes(actual.consensus)) {
        score += 1.0;
      }
      factors++;
    }
    
    return factors > 0 ? score / factors : 0;
  }

  /**
   * Get Opik dashboard URL
   */
  getDashboardUrl(): string {
    // Assuming default workspace or from env
    const workspace = process.env.OPIK_WORKSPACE || 'ozziegooen';
    return `https://www.comet.com/opik/${workspace}/${this.projectName}`;
  }
}

/**
 * Track a function with Opik
 */
export const trackWithOpik = track;