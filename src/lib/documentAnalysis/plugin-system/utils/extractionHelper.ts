/**
 * Extraction helper utilities for plugins
 * Makes extraction more functional and decoupled from BasePlugin
 */

import { callClaudeWithTool, MODEL_CONFIG } from '../../../claude/wrapper';
import { sessionContext } from '../../../helicone/sessionContext';
import { createHeliconeHeaders } from '../../../helicone/sessions';
import { TextChunk } from '../TextChunk';
import { logger } from '../../../logger';
import { estimateTokens } from '../../../tokenUtils';
import type { LLMInteraction } from '@/types/llm';

export interface ExtractionConfig {
  toolName: string;
  toolDescription: string;
  toolSchema: any;
  extractionPrompt?: string;
  pluginName: string;
}

export interface ExtractionResult<T> {
  result: T;
  cost: number;
  interaction: LLMInteraction;
}

/**
 * Extract data from a text chunk using Claude with tool use
 * This is a pure function that doesn't depend on plugin state
 */
export async function extractWithTool<T>(
  chunk: TextChunk,
  config: ExtractionConfig
): Promise<ExtractionResult<T>> {
  const prompt = config.extractionPrompt || buildDefaultExtractionPrompt(chunk);
  
  // Get session context if available
  const currentSession = sessionContext.getSession();
  const sessionConfig = currentSession ? 
    sessionContext.withPath(`/plugins/${config.pluginName}/extract`) : 
    undefined;
  const heliconeHeaders = sessionConfig ? 
    createHeliconeHeaders(sessionConfig) : 
    undefined;
    
  const startTime = Date.now();
  
  try {
    const { response, toolResult } = await callClaudeWithTool<T>({
      model: MODEL_CONFIG.analysis,
      system: "You are an AI assistant specialized in analyzing text and extracting specific types of content. Follow the tool schema exactly.",
      messages: [{
        role: "user",
        content: prompt
      }],
      toolName: config.toolName,
      toolDescription: config.toolDescription,
      toolSchema: config.toolSchema,
      heliconeHeaders
    });
    
    const duration = Date.now() - startTime;
    
    // Calculate cost
    const promptTokens = estimateTokens(prompt);
    const responseText = JSON.stringify(toolResult);
    const completionTokens = estimateTokens(responseText);
    
    const cost = calculateCost(MODEL_CONFIG.analysis, promptTokens, completionTokens);
    
    // Create interaction record in standard LLMInteraction format
    const interaction: LLMInteraction = {
      messages: [
        { role: 'system' as const, content: 'You are a document analysis assistant.' },
        { role: 'user' as const, content: prompt },
        { role: 'assistant' as const, content: responseText }
      ],
      usage: {
        input_tokens: promptTokens,
        output_tokens: completionTokens
      }
    };
    
    logger.info(`Plugin extraction completed`, {
      plugin: config.pluginName,
      toolName: config.toolName,
      chunkId: chunk.id,
      tokensUsed: { prompt: promptTokens, completion: completionTokens, total: promptTokens + completionTokens },
      cost
    });
    
    return { 
      result: toolResult as T, 
      cost,
      interaction
    };
  } catch (error) {
    logger.error(`Extraction failed for ${config.pluginName}`, error);
    throw error;
  }
}

/**
 * Build default extraction prompt for a chunk
 */
function buildDefaultExtractionPrompt(chunk: TextChunk): string {
  return `Please analyze the following text chunk and extract relevant content:

${chunk.text}

Chunk metadata:
- ID: ${chunk.id}
- Position: lines ${chunk.metadata?.lineInfo?.startLine || 0} to ${chunk.metadata?.lineInfo?.endLine || 0}`;
}

/**
 * Calculate cost based on token usage
 */
function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  // Claude 3 Haiku pricing (as of 2024)
  const HAIKU_INPUT_COST = 0.25 / 1_000_000; // $0.25 per 1M input tokens
  const HAIKU_OUTPUT_COST = 1.25 / 1_000_000; // $1.25 per 1M output tokens
  
  return (promptTokens * HAIKU_INPUT_COST) + (completionTokens * HAIKU_OUTPUT_COST);
}