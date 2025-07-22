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
import { calculateCost as utilsCalculateCost, mapModelToCostModel } from '@/utils/costCalculator';
import type { LLMInteraction } from '@/types/llm';

export interface ExtractionConfig {
  toolName: string;
  toolDescription: string;
  toolSchema: Record<string, unknown>;
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
  // Input validation
  if (!chunk || !chunk.text) {
    throw new Error('Valid text chunk is required for extraction');
  }
  if (!config || !config.toolName || !config.toolSchema) {
    throw new Error('Valid extraction config with toolName and toolSchema is required');
  }
  
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
    const { toolResult } = await callClaudeWithTool<T>({
      model: MODEL_CONFIG.analysis,
      system: "You are an AI assistant specialized in analyzing text and extracting specific types of content. Follow the tool schema exactly.",
      messages: [{
        role: "user",
        content: prompt
      }],
      toolName: config.toolName,
      toolDescription: config.toolDescription,
      toolSchema: { type: 'object', ...config.toolSchema },
      heliconeHeaders
    });
    
    // Calculate cost
    const promptTokens = estimateTokens(prompt);
    const responseText = JSON.stringify(toolResult);
    const completionTokens = estimateTokens(responseText);
    
    const modelForCost = mapModelToCostModel(MODEL_CONFIG.analysis);
    const costCalculation = utilsCalculateCost(modelForCost, promptTokens, completionTokens);
    const cost = costCalculation.totalCost;
    
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

