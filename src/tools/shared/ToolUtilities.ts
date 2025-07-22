/**
 * Shared utilities for tools to reduce code duplication
 */

import { callClaudeWithTool, MODEL_CONFIG } from '@/lib/claude/wrapper';
import { z } from 'zod';

/**
 * Common tool configuration interface
 */
export interface ToolConfig {
  domain: string;
  taskDescription: string;
  systemPromptTemplate: string;
  userPromptTemplate: string;
  examples?: string[];
  outputFormat?: string;
}

/**
 * Template engine for generating consistent prompts
 */
export class PromptTemplateEngine {
  static buildSystemPrompt(
    domain: string, 
    taskDescription: string, 
    toolName: string,
    additionalInstructions?: string
  ): string {
    const baseTemplate = `You are a {domain} assistant. Your task is to {taskDescription}.

CRITICAL: You MUST use the {toolName} tool to report your findings. Do not respond with plain text.

{additionalInstructions}

Focus on being accurate, thorough, and specific in your analysis.`;

    return baseTemplate
      .replace('{domain}', domain)
      .replace('{taskDescription}', taskDescription)
      .replace('{toolName}', toolName)
      .replace('{additionalInstructions}', additionalInstructions || '');
  }

  static buildUserPrompt(
    template: string,
    variables: Record<string, string>
  ): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    return result;
  }

  static buildAnalysisPrompt(content: string, taskDescription: string): string {
    return `Please analyze the following content: ${taskDescription}

Content to analyze:
${content}

CRITICAL: Use the provided tool to report your findings. Be thorough and specific.`;
  }
}

/**
 * Standard schema builders for common tool patterns
 */
export class ToolSchemaBuilder {
  static analysisSchema(itemType: string, properties: Record<string, unknown>): unknown {
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
                description: `Unique identifier for this ${itemType}`
              },
              text: {
                type: "string",
                description: `The exact text containing the ${itemType}`
              },
              description: {
                type: "string", 
                description: `Description of the ${itemType}`
              },
              severity: {
                type: "string",
                enum: ["low", "medium", "high"],
                description: "Severity level of this finding"
              },
              category: {
                type: "string",
                description: `Category of this ${itemType}`
              },
              ...properties
            },
            required: ["id", "text", "description", "severity", "category"]
          }
        },
        summary: {
          type: "string",
          description: "Overall summary of the analysis"
        },
        recommendations: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Specific recommendations based on the analysis"
        }
      },
      required: ["items", "summary", "recommendations"]
    };
  }

  static verificationSchema(): unknown {
    return {
      type: "object", 
      properties: {
        verifications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              statement: {
                type: "string",
                description: "The statement being verified"
              },
              isAccurate: {
                type: "boolean",
                description: "Whether the statement is accurate"
              },
              confidence: {
                type: "string",
                enum: ["low", "medium", "high"],
                description: "Confidence level in the verification"
              },
              evidence: {
                type: "string",
                description: "Evidence supporting the verification"
              },
              reasoning: {
                type: "string",
                description: "Reasoning behind the verification"
              }
            },
            required: ["statement", "isAccurate", "confidence", "reasoning"]
          }
        },
        overallAssessment: {
          type: "string",
          description: "Overall assessment of accuracy"
        }
      },
      required: ["verifications", "overallAssessment"]
    };
  }

  static extractionSchema(itemType: string, extractionProperties: Record<string, unknown>): unknown {
    return {
      type: "object",
      properties: {
        extractions: {
          type: "array",
          items: {
            type: "object", 
            properties: {
              content: {
                type: "string",
                description: `The extracted ${itemType} content`
              },
              context: {
                type: "string",
                description: "Surrounding context"
              },
              confidence: {
                type: "string",
                enum: ["low", "medium", "high"],
                description: "Confidence in the extraction"
              },
              ...extractionProperties
            },
            required: ["content", "context", "confidence"]
          }
        }
      },
      required: ["extractions"]
    };
  }
}

/**
 * Standard LLM interaction patterns for tools
 */
export class ToolLLMUtils {
  /**
   * Standard analysis call with error handling
   */
  static async performAnalysis<T>(
    content: string,
    config: ToolConfig,
    toolName: string,
    toolSchema: unknown,
    variables?: Record<string, string>
  ): Promise<T> {
    const systemPrompt = PromptTemplateEngine.buildSystemPrompt(
      config.domain,
      config.taskDescription,
      toolName
    );

    const userPrompt = variables 
      ? PromptTemplateEngine.buildUserPrompt(config.userPromptTemplate, { content, ...variables })
      : PromptTemplateEngine.buildAnalysisPrompt(content, config.taskDescription);

    try {
      const { toolResult } = await callClaudeWithTool<T>({
        model: MODEL_CONFIG.analysis,
        max_tokens: 2000,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt
          }
        ],
        toolName,
        toolDescription: `Perform ${config.domain} analysis on the provided content`,
        toolSchema
      });

      return toolResult;
    } catch (error) {
      throw new Error(`Tool analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Standard verification call
   */
  static async performVerification<T>(
    content: string,
    statements: string[],
    domain: string
  ): Promise<T> {
    const systemPrompt = `You are a ${domain} verification expert. Your task is to verify the accuracy of statements found in the provided content.`;
    
    const userPrompt = `Please verify the following statements against the provided content:

Statements to verify:
${statements.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Content:
${content}

CRITICAL: Use the verification tool to report your findings.`;

    try {
      const { toolResult } = await callClaudeWithTool<T>({
        model: MODEL_CONFIG.analysis,
        max_tokens: 2000,
        temperature: 0,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt
          }
        ],
        toolName: "verify_statements",
        toolDescription: `Verify the accuracy of statements in ${domain} content`,
        toolSchema: ToolSchemaBuilder.verificationSchema()
      });

      return toolResult;
    } catch (error) {
      throw new Error(`Verification failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Common error categorization patterns
 */
export class ToolErrorCategorizer {
  static categorizeByKeywords(
    description: string, 
    categories: Record<string, string[]>
  ): string {
    const lowerDesc = description.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerDesc.includes(keyword))) {
        return category;
      }
    }
    
    return 'other';
  }

  static determineSeverity(
    category: string,
    description: string,
    severityMap?: Record<string, 'low' | 'medium' | 'high'>
  ): 'low' | 'medium' | 'high' {
    if (severityMap && severityMap[category]) {
      return severityMap[category];
    }

    // Default severity based on common patterns
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('critical') || lowerDesc.includes('major') || lowerDesc.includes('incorrect')) {
      return 'high';
    }
    if (lowerDesc.includes('minor') || lowerDesc.includes('style') || lowerDesc.includes('suggestion')) {
      return 'low';
    }
    return 'medium';
  }
}

/**
 * Standard validation patterns
 */
export const ToolValidation = {
  contentSchema: z.object({
    content: z.string().min(1, "Content is required")
  }),

  analysisConfigSchema: z.object({
    content: z.string().min(1, "Content is required"),
    options: z.object({
      includeRecommendations: z.boolean().optional(),
      severityFilter: z.enum(['low', 'medium', 'high']).optional(),
      maxItems: z.number().positive().optional()
    }).optional()
  }),

  extractionConfigSchema: z.object({
    content: z.string().min(1, "Content is required"),
    extractionType: z.string().min(1, "Extraction type is required"),
    includeContext: z.boolean().optional()
  })
};

/**
 * Standard response formatters
 */
export class ToolResponseFormatter {
  static formatAnalysisResult(result: { items?: unknown[]; summary?: string; recommendations?: unknown[] }, toolId: string): unknown {
    return {
      success: true,
      toolId,
      result: {
        items: result.items || [],
        summary: result.summary || "Analysis completed",
        recommendations: result.recommendations || [],
        metadata: {
          itemCount: result.items?.length || 0,
          timestamp: new Date().toISOString()
        }
      }
    };
  }

  static formatError(error: Error, toolId: string): unknown {
    return {
      success: false,
      toolId,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }

  static formatVerificationResult(result: { verifications?: unknown[]; overallAssessment?: string }, toolId: string): unknown {
    return {
      success: true,
      toolId, 
      result: {
        verifications: result.verifications || [],
        overallAssessment: result.overallAssessment || "Verification completed",
        metadata: {
          verificationCount: result.verifications?.length || 0,
          timestamp: new Date().toISOString()
        }
      }
    };
  }
}

