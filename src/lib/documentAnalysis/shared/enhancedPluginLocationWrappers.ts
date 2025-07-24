/**
 * Enhanced plugin location wrappers with LLM fallback
 */

import { findTextLocation, EnhancedLocationOptions } from './enhancedTextLocationFinder';
import type { HeliconeSessionConfig } from '@/lib/helicone/sessions';
import { sessionContext } from '@/lib/helicone/sessionContext';

// Common location interface for all plugins
export interface PluginLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
}

/**
 * Find location for spelling errors with LLM fallback
 */
export async function findSpellingErrorLocation(
  errorText: string,
  chunkText: string,
  context?: string,
  sessionConfig?: HeliconeSessionConfig
): Promise<PluginLocation | null> {
  // Get session from context if not provided
  const activeSession = sessionConfig || sessionContext.getSession();
  
  const result = await findTextLocation(errorText, chunkText, {
    normalizeQuotes: true,  // Handle apostrophe variations
    partialMatch: true,     // For longer errors
    context,                // Use context if provided
    useLLMFallback: true,   // Enable LLM fallback for difficult cases
    sessionConfig: activeSession,  // Track in Helicone
    pluginName: 'spelling'
  });
  
  if (result) {
    return {
      startOffset: result.startOffset,
      endOffset: result.endOffset,
      quotedText: result.quotedText
    };
  }
  
  return null;
}

/**
 * Find location for forecasts with LLM fallback
 */
export async function findForecastLocation(
  forecastText: string,
  documentText: string,
  sessionConfig?: HeliconeSessionConfig
): Promise<PluginLocation | null> {
  // Get session from context if not provided
  const activeSession = sessionConfig || sessionContext.getSession();
  
  const result = await findTextLocation(forecastText, documentText, {
    normalizeQuotes: true,  // Handle quote variations
    partialMatch: true,     // Forecasts can be long
    useLLMFallback: true,   // Enable LLM fallback
    sessionConfig: activeSession,  // Track in Helicone
    pluginName: 'forecast'
  });
  
  if (result) {
    return {
      startOffset: result.startOffset,
      endOffset: result.endOffset,
      quotedText: result.quotedText
    };
  }
  
  return null;
}

/**
 * Find location for facts with LLM fallback
 */
export async function findFactLocation(
  claimText: string,
  documentText: string,
  sessionConfig?: HeliconeSessionConfig
): Promise<PluginLocation | null> {
  // Get session from context if not provided
  const activeSession = sessionConfig || sessionContext.getSession();
  
  const result = await findTextLocation(claimText, documentText, {
    useLLMFallback: true,   // Enable LLM fallback
    sessionConfig: activeSession,  // Track in Helicone
    pluginName: 'fact-check'
  });
  
  if (result) {
    return {
      startOffset: result.startOffset,
      endOffset: result.endOffset,
      quotedText: result.quotedText
    };
  }
  
  return null;
}

/**
 * Find location for math expressions with LLM fallback
 */
export async function findMathLocation(
  mathExpression: string,
  chunkText: string,
  sessionConfig?: HeliconeSessionConfig
): Promise<PluginLocation | null> {
  // Get session from context if not provided
  const activeSession = sessionConfig || sessionContext.getSession();
  
  const result = await findTextLocation(mathExpression, chunkText, {
    normalizeQuotes: true,  // Math might have quote variations
    useLLMFallback: true,   // Enable LLM fallback for complex expressions
    sessionConfig: activeSession,  // Track in Helicone
    pluginName: 'math'
  });
  
  if (result) {
    return {
      startOffset: result.startOffset,
      endOffset: result.endOffset,
      quotedText: result.quotedText
    };
  }
  
  return null;
}