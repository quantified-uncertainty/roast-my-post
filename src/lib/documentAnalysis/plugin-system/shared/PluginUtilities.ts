/**
 * Shared utilities for plugins to reduce code duplication
 */

import { callClaudeWithTool, MODEL_CONFIG } from '../../../claude/wrapper';
import { Finding } from '../types';
import { TextChunk } from '../TextChunk';
import { logger } from '../../../../lib/logger';
import { estimateTokens } from '../../../tokenUtils';

/**
 * Standard prompt builder for extraction tasks
 */
export class PromptBuilder {
  private domain: string;
  private taskDescription: string;
  private examples: string[];

  constructor(domain: string, taskDescription: string, examples: string[] = []) {
    this.domain = domain;
    this.taskDescription = taskDescription;
    this.examples = examples;
  }

  buildExtractionPrompt(chunk: TextChunk): string {
    const basePrompt = `Extract all ${this.domain} content from this text chunk.

TASK: ${this.taskDescription}

TEXT TO ANALYZE:
${chunk.text}

CRITICAL: You MUST use the extraction tool to report your findings. Do not respond with plain text.`;

    if (this.examples.length > 0) {
      return `${basePrompt}

EXAMPLES OF WHAT TO LOOK FOR:
${this.examples.map(ex => `- ${ex}`).join('\n')}`;
    }

    return basePrompt;
  }

  buildSynthesisPrompt(items: any[], analysisType: string): string {
    return `You have identified ${items.length} ${this.domain} items. Now synthesize them into a comprehensive analysis.

TASK: ${analysisType}

ITEMS TO SYNTHESIZE:
${items.map((item, i) => `${i + 1}. ${JSON.stringify(item)}`).join('\n')}

CRITICAL: You MUST use the synthesis tool to report your analysis. Provide insights, patterns, and recommendations.`;
  }
}

/**
 * Standard finding generator for different analysis types
 */
export class FindingGenerator {
  static createErrorFinding(
    text: string,
    description: string,
    chunkId: string,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): Finding {
    return {
      type: 'error',
      severity,
      message: `Error: ${description}`,
      metadata: {
        originalText: text,
        chunkId,
        category: 'analysis_error'
      }
    };
  }

  static createVerificationFinding(
    item: any,
    isValid: boolean,
    reasoning: string,
    chunkId: string
  ): Finding {
    return {
      type: isValid ? 'verified' : 'invalid',
      severity: isValid ? 'low' : 'high',
      message: isValid 
        ? `Verified: ${reasoning}`
        : `Invalid: ${reasoning}`,
      metadata: {
        originalItem: item,
        chunkId,
        category: 'verification'
      }
    };
  }

  static createRecommendationFinding(
    recommendation: string,
    context: string,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): Finding {
    return {
      type: 'recommendation',
      severity,
      message: recommendation,
      metadata: {
        context,
        category: 'improvement_suggestion'
      }
    };
  }
}

/**
 * Standard LLM interaction patterns for plugins
 */
export class PluginLLMUtils {
  /**
   * Generic extraction call with standardized error handling
   */
  static async extractWithTool<T>(
    prompt: string,
    toolName: string,
    toolDescription: string,
    toolSchema: any,
    chunkId?: string
  ): Promise<{ result: T; cost: number }> {
    try {
      const { response, toolResult } = await callClaudeWithTool<T>({
        model: MODEL_CONFIG.analysis,
        max_tokens: 1500,
        temperature: 0,
        system: prompt,
        messages: [
          {
            role: "user",
            content: "Please analyze the provided text using the extraction tool."
          }
        ],
        toolName,
        toolDescription,
        toolSchema
      });

      const cost = this.calculateCost(response.usage);
      
      logger.info(`Plugin extraction completed`, {
        toolName,
        chunkId,
        tokensUsed: response.usage,
        cost
      });

      return { result: toolResult, cost };
    } catch (error) {
      logger.error(`Plugin extraction failed`, {
        toolName,
        chunkId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generic synthesis call with standardized error handling
   */
  static async synthesizeWithTool<T>(
    prompt: string,
    toolName: string,
    toolDescription: string,
    toolSchema: any,
    itemCount: number
  ): Promise<{ result: T; cost: number }> {
    try {
      const { response, toolResult } = await callClaudeWithTool<T>({
        model: MODEL_CONFIG.analysis,
        max_tokens: 2000,
        temperature: 0.3,
        system: prompt,
        messages: [
          {
            role: "user",
            content: "Please synthesize the findings using the synthesis tool."
          }
        ],
        toolName,
        toolDescription,
        toolSchema
      });

      const cost = this.calculateCost(response.usage);
      
      logger.info(`Plugin synthesis completed`, {
        toolName,
        itemCount,
        tokensUsed: response.usage,
        cost
      });

      return { result: toolResult, cost };
    } catch (error) {
      logger.error(`Plugin synthesis failed`, {
        toolName,
        itemCount,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private static calculateCost(usage: any): number {
    // Calculate cost based on actual token usage
    // Claude 3 Sonnet pricing as of 2024
    const inputCost = (usage?.input_tokens || 0) * 0.000003;  // $3 per 1M input tokens
    const outputCost = (usage?.output_tokens || 0) * 0.000015; // $15 per 1M output tokens
    return inputCost + outputCost;
  }
}

/**
 * Common schema patterns for plugins
 */
export class SchemaBuilder {
  static extractionSchema(itemName: string, properties: Record<string, any>): any {
    return {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: `Unique identifier for this ${itemName}`
              },
              text: {
                type: "string", 
                description: `The exact text containing the ${itemName}`
              },
              context: {
                type: "string",
                description: "Surrounding context for the finding"
              },
              ...properties
            },
            required: ["id", "text", "context"]
          }
        }
      },
      required: ["items"]
    };
  }

  static synthesisSchema(analysisType: string): any {
    return {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: `Overall summary of the ${analysisType} analysis`
        },
        keyFindings: {
          type: "array",
          items: {
            type: "string"
          },
          description: "List of key findings or insights"
        },
        recommendations: {
          type: "array", 
          items: {
            type: "string"
          },
          description: "Specific recommendations based on the analysis"
        },
        confidence: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Confidence level in the analysis"
        }
      },
      required: ["summary", "keyFindings", "recommendations", "confidence"]
    };
  }
}

/**
 * Standard error categorization patterns
 */
export class ErrorCategorizer {
  static categorizeByKeywords(description: string, categories: Record<string, string[]>): string {
    const lowerDesc = description.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerDesc.includes(keyword))) {
        return category;
      }
    }
    
    return 'unknown';
  }

  static determineSeverity(errorType: string, description: string, severityMap: Record<string, 'low' | 'medium' | 'high'>): 'low' | 'medium' | 'high' {
    if (severityMap[errorType]) {
      return severityMap[errorType];
    }

    // Default severity based on common patterns
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('critical') || lowerDesc.includes('major') || lowerDesc.includes('wrong')) {
      return 'high';
    }
    if (lowerDesc.includes('minor') || lowerDesc.includes('style') || lowerDesc.includes('suggestion')) {
      return 'low';
    }
    return 'medium';
  }
}