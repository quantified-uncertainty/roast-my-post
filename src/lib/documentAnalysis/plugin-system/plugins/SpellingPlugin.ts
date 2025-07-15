/**
 * Spelling and grammar checking plugin
 */

import { BasePlugin } from '../BasePlugin';
import { ChunkResult, SynthesisResult, Finding, RoutingExample } from '../types';
import { TextChunk } from '../TextChunk';
import { anthropic, ANALYSIS_MODEL } from '../../../../types/openai';

interface SpellingState {
  errors: Array<{
    text: string;
    correction: string;
    type: 'spelling' | 'grammar' | 'style';
    chunkId: string;
    context: string;
  }>;
  commonPatterns: Map<string, number>;
}

export class SpellingPlugin extends BasePlugin<SpellingState> {
  constructor() {
    super({
      errors: [],
      commonPatterns: new Map()
    });
  }

  name(): string {
    return "SPELLING";
  }

  promptForWhenToUse(): string {
    return `Call this for ALL text chunks to check spelling, grammar, and style. This is a basic check that should run on every chunk unless explicitly excluded.`;
  }

  override routingExamples(): RoutingExample[] {
    return [
      {
        chunkText: "Any normal text content",
        shouldProcess: true,
        reason: "All text should be checked for spelling and grammar"
      },
      {
        chunkText: "[1] Smith, J. (2023). Title. Journal. [2] Doe, J. (2022)...",
        shouldProcess: false,
        reason: "Pure reference lists can be skipped"
      }
    ];
  }

  async processChunk(chunk: TextChunk): Promise<ChunkResult> {
    const { result, interaction } = await this.trackLLMCall(
      ANALYSIS_MODEL,
      this.buildCheckPrompt(chunk),
      () => this.checkSpellingGrammar(chunk)
    );

    const findings: Finding[] = [];

    // Process errors
    result.errors.forEach(error => {
      this.state.errors.push({
        ...error,
        chunkId: chunk.id,
        context: chunk.getContext(0, 50) // Get some context
      });

      // Track patterns
      const count = this.state.commonPatterns.get(error.type) || 0;
      this.state.commonPatterns.set(error.type, count + 1);

      findings.push({
        type: `${error.type}_error`,
        severity: 'low',
        message: `${error.type} error: "${error.text}" → "${error.correction}"`,
        metadata: {
          original: error.text,
          suggestion: error.correction,
          errorType: error.type
        }
      });
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
    const totalErrors = this.state.errors.length;
    
    // Group errors by type
    const errorsByType = new Map<string, number>();
    this.state.errors.forEach(error => {
      errorsByType.set(error.type, (errorsByType.get(error.type) || 0) + 1);
    });

    // Find most common errors
    const commonErrors = this.findCommonErrors();

    let summary = `Found ${totalErrors} spelling/grammar issues`;
    if (errorsByType.size > 0) {
      const types = Array.from(errorsByType.entries())
        .map(([type, count]) => `${count} ${type}`)
        .join(', ');
      summary += ` (${types})`;
    }

    if (commonErrors.length > 0) {
      summary += `. Most frequent: ${commonErrors.slice(0, 3).map(e => `"${e.text}"`).join(', ')}.`;
    }

    const findings: Finding[] = [];
    
    // Add finding for systematic issues
    if (totalErrors > 20) {
      findings.push({
        type: 'systematic_issue',
        severity: 'medium',
        message: `Document has numerous spelling/grammar issues (${totalErrors} total). Consider comprehensive proofreading.`
      });
    }

    // Add findings for repeated errors
    commonErrors.forEach(error => {
      if (error.count > 2) {
        findings.push({
          type: 'repeated_error',
          severity: 'low',
          message: `"${error.text}" appears ${error.count} times (suggest: "${error.correction}")`
        });
      }
    });

    const recommendations = this.generateRecommendations();

    return {
      summary,
      findings,
      recommendations,
      llmCalls: []
    };
  }

  protected createInitialState(): SpellingState {
    return {
      errors: [],
      commonPatterns: new Map()
    };
  }

  private buildCheckPrompt(chunk: TextChunk): string {
    return `Check this text for spelling, grammar, and style issues. Focus on clear errors, not stylistic preferences.

Text to check:
${chunk.text}

Report any errors found with suggested corrections.`;
  }

  private async checkSpellingGrammar(chunk: TextChunk): Promise<{
    errors: Array<{
      text: string;
      correction: string;
      type: 'spelling' | 'grammar' | 'style';
    }>;
  }> {
    const response = await anthropic.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 1000,
      temperature: 0,
      system: "You are a proofreading assistant. Identify spelling, grammar, and major style issues.",
      messages: [{
        role: "user",
        content: this.buildCheckPrompt(chunk)
      }],
      tools: [{
        name: "report_errors",
        description: "Report spelling, grammar, and style errors",
        input_schema: {
          type: "object",
          properties: {
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  text: { type: "string", description: "The incorrect text" },
                  correction: { type: "string", description: "Suggested correction" },
                  type: {
                    type: "string",
                    enum: ["spelling", "grammar", "style"],
                    description: "Type of error"
                  }
                },
                required: ["text", "correction", "type"]
              }
            }
          },
          required: ["errors"]
        }
      }],
      tool_choice: { type: "tool", name: "report_errors" }
    });

    const toolUse = response.content.find((c: any) => c.type === "tool_use") as any;
    return toolUse?.input || { errors: [] };
  }

  private findCommonErrors(): Array<{
    text: string;
    correction: string;
    count: number;
  }> {
    const errorCounts = new Map<string, { correction: string; count: number }>();
    
    this.state.errors.forEach(error => {
      const key = error.text.toLowerCase();
      if (errorCounts.has(key)) {
        errorCounts.get(key)!.count++;
      } else {
        errorCounts.set(key, {
          correction: error.correction,
          count: 1
        });
      }
    });

    return Array.from(errorCounts.entries())
      .map(([text, data]) => ({
        text,
        correction: data.correction,
        count: data.count
      }))
      .sort((a, b) => b.count - a.count);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const errorCount = this.state.errors.length;

    if (errorCount > 50) {
      recommendations.push('Consider using a professional proofreading service');
    } else if (errorCount > 20) {
      recommendations.push('Run document through additional grammar checking tools');
    }

    const grammarErrors = this.state.errors.filter(e => e.type === 'grammar').length;
    if (grammarErrors > 10) {
      recommendations.push('Review sentence structure and grammar rules');
    }

    const commonErrors = this.findCommonErrors();
    if (commonErrors.length > 0 && commonErrors[0].count > 3) {
      recommendations.push(`Use find-and-replace for repeated errors like "${commonErrors[0].text}"`);
    }

    return recommendations;
  }
}