/**
 * Math verification plugin using enhanced base functionality
 */

import { EnhancedBasePlugin, PluginConfig } from '../EnhancedBasePlugin';
import { ChunkResult, SynthesisResult, Finding, RoutingExample } from '../types';
import { TextChunk } from '../TextChunk';

interface MathState {
  equations: Array<{
    id: string;
    text: string;
    chunkId: string;
    context: string;
    verified?: boolean;
    error?: string;
  }>;
  errors: Array<{
    equation: string;
    error: string;
    chunkId: string;
  }>;
}

export class MathPluginRefactored extends EnhancedBasePlugin<MathState> {
  constructor() {
    const config: PluginConfig = {
      domain: "mathematical expressions and calculations",
      taskDescription: "Extract all equations, calculations, and mathematical statements, then verify their correctness",
      examples: [
        "Equations and formulas (2+2=4, E=mc², etc.)",
        "Statistical calculations or percentages", 
        "Back-of-the-envelope calculations",
        "Mathematical reasoning or proofs",
        "Numerical comparisons (X is 3x larger than Y)",
        "Unit conversions"
      ],
      extractionProperties: {
        equation: { 
          type: "string", 
          description: "The mathematical expression" 
        },
        isCorrect: { 
          type: "boolean", 
          description: "Whether the math is correct" 
        },
        error: { 
          type: "string", 
          description: "Error description if incorrect" 
        },
        location: {
          type: "object",
          properties: {
            start: { type: "number" },
            end: { type: "number" }
          }
        }
      },
      synthesisType: "mathematical accuracy analysis",
      errorCategories: {
        arithmetic: ["arithmetic", "calculation", "addition", "subtraction", "multiplication", "division"],
        unit_conversion: ["unit", "conversion", "dimensional", "measurement"],
        percentage: ["percentage", "percent", "%", "proportion", "ratio"],
        formula: ["formula", "equation", "expression"],
        logic: ["logic", "reasoning", "proof", "derivation"]
      },
      severityMap: {
        arithmetic: 'high',
        unit_conversion: 'high', 
        percentage: 'medium',
        formula: 'high',
        logic: 'medium'
      }
    };

    super({
      equations: [],
      errors: []
    }, config);
  }

  name(): string {
    return "MATH";
  }

  promptForWhenToUse(): string {
    return `Call this when there is math of any kind. This includes:
- ${this.config.examples?.join('\n- ')}
- Any discussion involving mathematical relationships`;
  }

  override routingExamples(): RoutingExample[] {
    return [
      {
        chunkText: "The population grew by 15% over the last decade, from 1.2M to 1.38M",
        shouldProcess: true,
        reason: "Contains percentage calculation that should be verified"
      },
      {
        chunkText: "Mathematics has been called the language of the universe", 
        shouldProcess: false,
        reason: "Discusses math conceptually but contains no actual math"
      },
      {
        chunkText: "If we assume a 7% annual return, $10,000 invested today would be worth $19,672 in 10 years",
        shouldProcess: true,
        reason: "Contains compound interest calculation"
      }
    ];
  }

  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    const { result, interaction } = await this.trackLLMCall(
      'claude-3-sonnet-20240229',
      `Extract and verify mathematical content from: ${chunk.text}`,
      () => this.performStandardExtraction<{
        equation: string;
        context: string;
        isCorrect: boolean;
        error?: string;
        location?: { start: number; end: number };
      }>(chunk, "report_math_content")
    );

    const findings: Finding[] = [];

    result.items.forEach(eq => {
      this.addToState('equations', [{
        id: `${chunk.id}-${this.getStateArrayCount('equations')}`,
        text: eq.equation,
        chunkId: chunk.id,
        context: eq.context,
        verified: eq.isCorrect,
        error: eq.error
      }]);

      if (!eq.isCorrect && eq.error) {
        this.addToState('errors', [{
          equation: eq.equation,
          error: eq.error,
          chunkId: chunk.id
        }]);

        const errorType = this.categorizeError(eq.error);
        const severity = this.determineSeverity(errorType, eq.error);
        
        findings.push(this.createErrorFinding(
          eq.equation,
          `Math error: ${eq.error}`,
          chunk.id,
          severity
        ));
      }
    });

    return {
      findings,
      llmCalls: [interaction],
      metadata: {
        tokensUsed: interaction.tokensUsed.total,
        processingTime: interaction.duration
      }
    };
  }

  async synthesize(): Promise<SynthesisResult> {
    const totalEquations = this.getStateArrayCount('equations');
    const errorCount = this.getStateArrayCount('errors');
    
    if (totalEquations === 0) {
      return {
        summary: "No mathematical content found to analyze.",
        findings: [],
        recommendations: [],
        llmCalls: []
      };
    }

    const { result } = await this.performStandardSynthesis<{
      summary: string;
      keyFindings: string[];
      recommendations: string[];
      confidence: 'low' | 'medium' | 'high';
    }>(this.state.equations, "synthesize_math_analysis");

    const errorPatterns = this.analyzeErrorPatterns();
    
    const findings: Finding[] = [
      ...this.state.errors.map(error => {
        const errorType = this.categorizeError(error.error);
        const severity = this.determineSeverity(errorType, error.error);
        return this.createErrorFinding(error.equation, error.error, error.chunkId, severity);
      }),
      ...errorPatterns.findings
    ];

    if (errorPatterns.hasPatterns) {
      findings.push(this.createRecommendationFinding(
        `Consider reviewing ${errorPatterns.mostCommonType} calculations more carefully`,
        `${errorPatterns.mostCommonCount} similar errors detected`,
        'medium'
      ));
    }

    const errorRate = (errorCount / totalEquations) * 100;
    const enhancedSummary = `${result.summary} Error rate: ${errorRate.toFixed(1)}% (${errorCount}/${totalEquations}).`;

    return {
      summary: enhancedSummary,
      findings,
      recommendations: [...result.recommendations, ...this.generateStandardRecommendations()],
      llmCalls: []
    };
  }

  protected createInitialState(): MathState {
    return {
      equations: [],
      errors: []
    };
  }

  /**
   * Analyze error patterns to identify common issues
   */
  private analyzeErrorPatterns(): {
    hasPatterns: boolean;
    mostCommonType: string;
    mostCommonCount: number;
    findings: Finding[];
  } {
    const errorTypes = this.state.errors.map(error => this.categorizeError(error.error));
    const typeCounts = errorTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const findings: Finding[] = [];
    
    if (Object.keys(typeCounts).length > 0) {
      const [mostCommonType, mostCommonCount] = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])[0];

      if (mostCommonCount > 2) {
        findings.push(this.createErrorFinding(
          `${mostCommonType} errors`,
          `Systematic ${mostCommonType} errors detected (${mostCommonCount} instances)`,
          'pattern-analysis',
          'high'
        ));
      }

      return {
        hasPatterns: mostCommonCount > 1,
        mostCommonType,
        mostCommonCount,
        findings
      };
    }

    return {
      hasPatterns: false,
      mostCommonType: 'unknown',
      mostCommonCount: 0,
      findings
    };
  }

  /**
   * Generate standard recommendations based on error patterns
   */
  private generateStandardRecommendations(): string[] {
    const recommendations: string[] = [];
    const errorTypes = this.state.errors.map(error => this.categorizeError(error.error));
    const typeCounts = errorTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recommendationMap: Record<string, string> = {
      arithmetic: 'Double-check arithmetic calculations',
      unit_conversion: 'Verify unit conversions and dimensional consistency',
      percentage: 'Review percentage calculations and ensure proper base values',
      formula: 'Validate formula usage and variable substitution',
      logic: 'Review mathematical reasoning and proof steps'
    };

    Object.entries(typeCounts).forEach(([type, count]) => {
      if (count > 0 && recommendationMap[type]) {
        recommendations.push(recommendationMap[type]);
      }
    });

    if (this.getStateArrayCount('errors') > 5) {
      recommendations.push('Consider having calculations reviewed by a subject matter expert');
    }

    return recommendations;
  }
}

