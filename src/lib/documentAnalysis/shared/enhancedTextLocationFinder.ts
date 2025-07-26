/**
 * Enhanced text location finder with LLM fallback
 * Includes Helicone session tracking for plugins
 */

import { getLineNumberAtPosition, getLineAtPosition } from "../../analysis-plugins/utils/textHelpers";
import { logger } from "@/lib/logger";
import { callClaudeWithTool, MODEL_CONFIG } from "@/lib/claude/wrapper";
import { sessionContext } from "@/lib/helicone/sessionContext";
import type { HeliconeSessionConfig } from "@/lib/helicone/sessions";

export interface TextLocation {
  startOffset: number;
  endOffset: number;
  quotedText: string;
  lineNumber: number;
  lineText: string;
  strategy: string;
  confidence: number;
}

export interface EnhancedLocationOptions {
  // Basic options
  normalizeQuotes?: boolean;
  partialMatch?: boolean;
  context?: string;
  // LLM fallback
  useLLMFallback?: boolean;
  // Session tracking
  sessionConfig?: HeliconeSessionConfig;
  pluginName?: string; // For metadata
}

/**
 * Normalize quotes for comparison (apostrophes, smart quotes, etc)
 */
function normalizeQuotes(text: string): string {
  return text
    .replace(/[""]/g, '"')
    .replace(/[''ʼ]/g, "'")
    .replace(/'/g, "'");
}

/**
 * Find text using LLM when other methods fail
 */
async function findWithLLM(
  searchText: string,
  documentText: string,
  context: string | undefined,
  pluginName: string
): Promise<TextLocation | null> {
  try {
    const schema = {
      properties: {
        found: {
          type: 'boolean',
          description: 'Whether the text was found in the document'
        },
        matchedText: {
          type: 'string',
          description: 'The actual text found in the document'
        },
        startOffset: {
          type: 'number',
          description: 'The character position where the matched text starts'
        },
        endOffset: {
          type: 'number',
          description: 'The character position where the matched text ends'
        },
        confidence: {
          type: 'number',
          description: 'Confidence score between 0 and 1'
        }
      },
      required: ['found', 'matchedText', 'startOffset', 'endOffset', 'confidence']
    };

    const prompt = `Find this text in the document. The text might not match exactly due to:
- Minor differences in wording
- Truncation (text cut off mid-word)
- Quote mark variations
- Small typos or OCR errors
- Special characters (£, €, $) or encoding issues
- Numbers formatted differently (2.2 billion vs £2.2B)
- Paraphrasing or reordering of words

Search text: "${searchText}"
${context ? `Context: ${context}` : ''}

Look for the SEMANTIC MEANING, not just exact text. The document might express the same idea with different words.

Document:
${documentText}

Find the best match based on meaning. Return the actual text from the document that conveys the same information.`;

    const { toolResult } = await callClaudeWithTool({
      model: MODEL_CONFIG.routing, // Use fast model for text finding
      messages: [{ role: 'user', content: prompt }],
      toolName: 'find_text_location',
      toolDescription: 'Find the location of text in a document',
      toolSchema: { type: 'object', ...schema },
      heliconeHeaders: {
        'Helicone-Property-Plugin': pluginName,
        'Helicone-Property-Task': 'text-location-fallback'
      }
    });

    const result = toolResult as {
      found: boolean;
      matchedText: string;
      startOffset: number;
      endOffset: number;
      confidence: number;
    };

    logger.debug('LLM fallback result', {
      found: result.found,
      matchedText: result.matchedText?.slice(0, 50),
      confidence: result.confidence,
      plugin: pluginName
    });

    if (result.found && result.matchedText) {
      // Validate the result isn't truncated or partial
      const searchWords = searchText.trim().split(/\s+/);
      const matchWords = result.matchedText.trim().split(/\s+/);
      
      // Check if the match is suspiciously truncated
      if (matchWords.length > 0) {
        const lastMatchWord = matchWords[matchWords.length - 1];
        const lastSearchWord = searchWords[searchWords.length - 1];
        
        // If the last word is truncated (unless search text is also truncated)
        if (lastMatchWord.length < 3 && lastSearchWord.length >= 3 && 
            !lastSearchWord.startsWith(lastMatchWord)) {
          logger.debug('LLM returned truncated match, rejecting', {
            searchText: searchText.slice(0, 50),
            matchedText: result.matchedText.slice(0, 50),
            plugin: pluginName
          });
          return null;
        }
      }
      
      // Verify the offsets
      const verifiedText = documentText.substring(result.startOffset, result.endOffset);
      if (verifiedText !== result.matchedText) {
        // Try to find the actual position
        const actualPos = documentText.indexOf(result.matchedText);
        if (actualPos !== -1) {
          result.startOffset = actualPos;
          result.endOffset = actualPos + result.matchedText.length;
        } else {
          // Match text not found in document at all
          logger.debug('LLM match not found in document', {
            matchedText: result.matchedText.slice(0, 50),
            plugin: pluginName
          });
          return null;
        }
      }

      return {
        startOffset: result.startOffset,
        endOffset: result.endOffset,
        quotedText: result.matchedText,
        lineNumber: getLineNumberAtPosition(documentText, result.startOffset),
        lineText: getLineAtPosition(documentText, result.startOffset),
        strategy: 'llm',
        confidence: Math.max(0.7, result.confidence * 0.9)
      };
    }

    logger.debug('LLM fallback: text not found', {
      searchText: searchText.slice(0, 50),
      plugin: pluginName
    });
    return null;
  } catch (error) {
    logger.error('LLM fallback failed:', error);
    return null;
  }
}

/**
 * Find text in document with optional LLM fallback
 */
export async function findTextLocation(
  searchText: string,
  documentText: string,
  options: EnhancedLocationOptions = {}
): Promise<TextLocation | null> {
  // Safety checks
  if (!searchText || !documentText) {
    return null;
  }

  // Set session context if provided
  if (options.sessionConfig) {
    sessionContext.setSession(options.sessionConfig);
  }

  try {
    let foundOffset = -1;
    let matchedText = searchText;
    let strategy = 'exact';
    let confidence = 1.0;

    // Strategy 1: Exact match
    foundOffset = documentText.indexOf(searchText);
    
    // DEBUG: Log exact match attempt
    if (foundOffset === -1) {
      logger.info(`❌ Text search: EXACT MATCH FAILED`, {
        searchText: searchText.slice(0, 50),
        documentLength: documentText.length,
        documentPreview: documentText.slice(0, 100),
        plugin: options.pluginName
      });
    }
    
    // Strategy 2: Normalized quotes (for spelling errors with apostrophes)
    if (foundOffset === -1 && options.normalizeQuotes) {
      const normalizedSearch = normalizeQuotes(searchText);
      const normalizedDoc = normalizeQuotes(documentText);
      foundOffset = normalizedDoc.indexOf(normalizedSearch);
      if (foundOffset !== -1) {
        strategy = 'quotes';
        confidence = 0.95;
        matchedText = documentText.slice(foundOffset, foundOffset + searchText.length);
      }
    }

    // Strategy 3: Case insensitive (always useful for spelling)
    if (foundOffset === -1) {
      const searchLower = searchText.toLowerCase();
      const docLower = documentText.toLowerCase();
      foundOffset = docLower.indexOf(searchLower);
      if (foundOffset !== -1) {
        strategy = 'case';
        confidence = 0.9;
        matchedText = documentText.slice(foundOffset, foundOffset + searchText.length);
      }
    }

    // Strategy 4: Partial match (for long quotes)
    if (foundOffset === -1 && options.partialMatch && searchText.length > 50) {
      const partial = searchText.slice(0, 50);
      foundOffset = documentText.indexOf(partial);
      if (foundOffset !== -1) {
        strategy = 'partial';
        confidence = 0.7;
        matchedText = partial;
      }
    }

    // Strategy 5: Context-based (for spelling errors)
    if (foundOffset === -1 && options.context) {
      const contextLower = options.context.toLowerCase();
      const searchLower = searchText.toLowerCase();
      const searchIndex = contextLower.indexOf(searchLower);
      
      if (searchIndex !== -1) {
        const beforeText = options.context.substring(Math.max(0, searchIndex - 20), searchIndex).trim();
        const beforeWords = beforeText.split(/\s+/).slice(-2).join(' ');
        
        if (beforeWords) {
          const pattern = beforeWords + ' ' + searchText;
          foundOffset = documentText.indexOf(pattern);
          if (foundOffset !== -1) {
            foundOffset += beforeWords.length + 1;
            strategy = 'context';
            confidence = 0.8;
          }
        }
      }
    }

    // If traditional methods failed and LLM fallback is enabled
    if (foundOffset === -1 && options.useLLMFallback) {
      logger.debug('Traditional methods failed, trying LLM fallback', {
        searchText: searchText.slice(0, 50),
        plugin: options.pluginName
      });
      
      const llmResult = await findWithLLM(
        searchText, 
        documentText, 
        options.context,
        options.pluginName || 'unknown'
      );
      
      if (llmResult) {
        return llmResult;
      }
    }

    // If nothing found, return null
    if (foundOffset === -1) {
      logger.debug('Text not found', { 
        searchText: searchText.slice(0, 50),
        strategy: 'none',
        plugin: options.pluginName
      });
      return null;
    }

    // Create the location result
    const location: TextLocation = {
      startOffset: foundOffset,
      endOffset: foundOffset + matchedText.length,
      quotedText: matchedText,
      lineNumber: getLineNumberAtPosition(documentText, foundOffset),
      lineText: getLineAtPosition(documentText, foundOffset),
      strategy,
      confidence
    };

    logger.debug('Text found', {
      strategy,
      confidence,
      preview: matchedText.slice(0, 50),
      plugin: options.pluginName
    });

    return location;
  } finally {
    // Clear session context
    if (options.sessionConfig) {
      sessionContext.clear();
    }
  }
}