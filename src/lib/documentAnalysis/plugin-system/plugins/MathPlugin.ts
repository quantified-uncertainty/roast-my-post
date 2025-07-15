/**
 * Math verification plugin
 */

import { BasePlugin } from '../BasePlugin';
import { ChunkResult, SynthesisResult, Finding, RoutingExample } from '../types';
import { TextChunk } from '../TextChunk';
import Anthropic from '@anthropic-ai/sdk';
import { ANALYSIS_MODEL } from '../../../../types/openai';

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

export class MathPlugin extends BasePlugin<MathState> {
  constructor() {
    super({
      equations: [],
      errors: []
    });
  }

  name(): string {
    return "MATH";
  }

  promptForWhenToUse(): string {
    return `Call this when there is math of any kind. This includes:
- Equations and formulas (2+2=4, E=mc², etc.)
- Statistical calculations or percentages
- Back-of-the-envelope calculations
- Mathematical reasoning or proofs
- Numerical comparisons (X is 3x larger than Y)
- Unit conversions
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
      ANALYSIS_MODEL,
      this.buildExtractionPrompt(chunk),
      () => this.extractAndVerifyMath(chunk)
    );

    const findings: Finding[] = [];

    // Process extracted equations
    result.equations.forEach(eq => {
      this.state.equations.push({
        id: `${chunk.id}-${this.state.equations.length}`,
        text: eq.equation,
        chunkId: chunk.id,
        context: eq.context,
        verified: eq.isCorrect,
        error: eq.error
      });

      if (!eq.isCorrect && eq.error) {
        this.state.errors.push({
          equation: eq.equation,
          error: eq.error,
          chunkId: chunk.id
        });

        findings.push({
          type: 'math_error',
          severity: 'medium',
          message: `Math error in "${eq.equation}": ${eq.error}`,
          location: eq.location
        });
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
    const totalEquations = this.state.equations.length;
    const errorCount = this.state.errors.length;
    const errorRate = totalEquations > 0 ? (errorCount / totalEquations) * 100 : 0;

    // Analyze patterns in errors
    const errorPatterns = this.analyzeErrorPatterns();

    const summary = `Found ${totalEquations} mathematical expressions with ${errorCount} errors (${errorRate.toFixed(1)}% error rate). ${errorPatterns.summary}`;

    const findings: Finding[] = [
      ...this.state.errors.map(error => ({
        type: 'math_error',
        severity: 'medium' as const,
        message: `Math error: ${error.error} in "${error.equation}"`
      })),
      ...errorPatterns.findings
    ];

    const recommendations = this.generateRecommendations(errorPatterns);

    return {
      summary,
      findings,
      recommendations,
      llmCalls: [] // No additional LLM calls in synthesis for this plugin
    };
  }

  protected createInitialState(): MathState {
    return {
      equations: [],
      errors: []
    };
  }

  private buildExtractionPrompt(chunk: TextChunk): string {
    return `Analyze this text for mathematical content. Extract all equations, calculations, and mathematical statements. For each one, verify if it's mathematically correct.

Text to analyze:
${chunk.text}

For each mathematical expression found:
1. Extract the exact equation or calculation
2. Verify if it's mathematically correct
3. If incorrect, explain the error
4. Note the context around it`;
  }

  private async extractAndVerifyMath(chunk: TextChunk): Promise<{
    equations: Array<{
      equation: string;
      context: string;
      isCorrect: boolean;
      error?: string;
      location?: { start: number; end: number };
    }>;
  }> {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    const response = await anthropic.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 1500,
      temperature: 0,
      system: "You are a mathematical verification system. Extract and verify all mathematical content.",
      messages: [{
        role: "user",
        content: this.buildExtractionPrompt(chunk)
      }],
      tools: [{
        name: "report_math_content",
        description: "Report mathematical content found in the text",
        input_schema: {
          type: "object",
          properties: {
            equations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  equation: { type: "string", description: "The mathematical expression" },
                  context: { type: "string", description: "Surrounding context" },
                  isCorrect: { type: "boolean", description: "Whether the math is correct" },
                  error: { type: "string", description: "Error description if incorrect" },
                  location: {
                    type: "object",
                    properties: {
                      start: { type: "number" },
                      end: { type: "number" }
                    }
                  }
                },
                required: ["equation", "context", "isCorrect"]
              }
            }
          },
          required: ["equations"]
        }
      }],
      tool_choice: { type: "tool", name: "report_math_content" }
    });

    const toolUse = response.content.find((c: any) => c.type === "tool_use") as any;
    return toolUse?.input || { equations: [] };
  }

  private analyzeErrorPatterns(): {
    summary: string;
    findings: Finding[];
    patterns: Map<string, number>;
  } {
    const patterns = new Map<string, number>();
    
    // Categorize errors
    this.state.errors.forEach(error => {
      if (error.error.toLowerCase().includes('arithmetic')) {
        patterns.set('arithmetic', (patterns.get('arithmetic') || 0) + 1);
      } else if (error.error.toLowerCase().includes('unit')) {
        patterns.set('unit_conversion', (patterns.get('unit_conversion') || 0) + 1);
      } else if (error.error.toLowerCase().includes('percentage')) {
        patterns.set('percentage', (patterns.get('percentage') || 0) + 1);
      } else {
        patterns.set('other', (patterns.get('other') || 0) + 1);
      }
    });

    const findings: Finding[] = [];
    let summary = '';

    if (patterns.size > 0) {
      const mostCommon = Array.from(patterns.entries())
        .sort((a, b) => b[1] - a[1])[0];
      
      summary = `Most common error type: ${mostCommon[0]} (${mostCommon[1]} instances).`;
      
      if (mostCommon[1] > 2) {
        findings.push({
          type: 'pattern',
          severity: 'high',
          message: `Systematic ${mostCommon[0]} errors detected (${mostCommon[1]} instances)`
        });
      }
    }

    return { summary, findings, patterns };
  }

  private generateRecommendations(errorPatterns: { patterns: Map<string, number> }): string[] {
    const recommendations: string[] = [];

    if (errorPatterns.patterns.get('arithmetic')! > 0) {
      recommendations.push('Double-check arithmetic calculations');
    }
    if (errorPatterns.patterns.get('unit_conversion')! > 0) {
      recommendations.push('Verify unit conversions and dimensional consistency');
    }
    if (errorPatterns.patterns.get('percentage')! > 0) {
      recommendations.push('Review percentage calculations and ensure proper base values');
    }

    if (this.state.errors.length > 5) {
      recommendations.push('Consider having calculations reviewed by a subject matter expert');
    }

    return recommendations;
  }
}