import { Opik } from 'opik';
import { Tool } from '../base/Tool';

/**
 * Opik Cloud integration for tool evaluation
 * Properly configured to use Comet Cloud instead of local instance
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
}

export class OpikCloudEvaluator {
  private opik: Opik;
  private tool: Tool;
  private projectName: string;
  
  constructor(tool: Tool) {
    this.tool = tool;
    this.projectName = `tool-evals-${tool.config.id}`;
    
    // Configure for Opik Cloud
    this.opik = new Opik({
      apiKey: process.env.OPIK_API_KEY!,
      // Don't specify workspace - it will use the default from your account
      projectName: this.projectName,
      // Force cloud mode
      baseURL: 'https://www.comet.com/opik/api/v1'
    });
  }

  /**
   * Run evaluation and create traces in Opik Cloud
   */
  async evaluate(testCases: TestCase[]): Promise<{
    results: TestResult[];
    summary: {
      totalTests: number;
      passed: number;
      averageScore: number;
    };
  }> {
    const results: TestResult[] = [];
    const experimentName = `${this.tool.config.id}-eval-${new Date().toISOString()}`;
    
    console.log(`🧪 Running ${testCases.length} test cases...\n`);
    console.log(`📊 Experiment: ${experimentName}\n`);
    
    for (const testCase of testCases) {
      try {
        // Create a trace for each test
        const trace = await this.opik.trace({
          name: testCase.name,
          input: testCase.input,
          metadata: {
            experiment: experimentName,
            expectedOutput: testCase.expectedOutput,
            toolVersion: this.tool.config.version
          },
          tags: ['evaluation', this.tool.config.category]
        });
        
        // Execute the tool
        const startTime = Date.now();
        const actualOutput = await this.tool.execute(
          testCase.input,
          { logger: console as any }
        );
        const duration = Date.now() - startTime;
        
        // Calculate quality score
        const qualityScore = this.calculateQualityScore(
          actualOutput,
          testCase.expectedOutput
        );
        
        // Update trace with results
        await trace.update({
          output: actualOutput,
          metadata: {
            ...trace.metadata,
            qualityScore,
            duration,
            passed: qualityScore >= 0.5
          }
        });
        
        // End the trace
        await trace.end();
        
        results.push({
          testCase: testCase.name,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput,
          success: true,
          qualityScore
        });
        
        console.log(`✅ ${testCase.name}: Score ${qualityScore.toFixed(2)}`);
        
      } catch (error) {
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
    }
    
    // Calculate summary
    const passed = results.filter(r => r.qualityScore >= 0.5).length;
    const averageScore = results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length;
    
    return {
      results,
      summary: {
        totalTests: results.length,
        passed,
        averageScore
      }
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
}