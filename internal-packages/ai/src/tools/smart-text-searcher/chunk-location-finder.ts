/**
 * Optimized location finding for chunk-based search
 *
 * Strategy: 3-tier search to minimize LLM usage on large documents
 * 1. Plain fuzzy search on chunk (fast, no LLM)
 * 2. LLM search on chunk only (medium cost, small input)
 * 3. Plain search on full document (no LLM on large text)
 */

import type { ToolContext } from "../base/Tool";
import type { TextLocationFinderOutput } from "./index";
import fuzzyTextLocatorTool from "./index";

export interface ChunkLocationInput {
  /** The chunk of text to search in first */
  chunkText: string;
  /** The full document text (for fallback search) */
  fullDocumentText?: string;
  /** Absolute offset where the chunk starts in the full document */
  chunkStartOffset: number;
  /** Text to search for */
  searchText: string;
  /** Optional line number hint */
  lineNumberHint?: number;
}

export interface ChunkLocationResult {
  found: boolean;
  location?: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
    strategy: string;
    confidence: number;
  };
}

/**
 * Tier 1: Plain fuzzy search on chunk (no LLM)
 */
async function searchChunkPlain(
  chunkText: string,
  searchText: string,
  lineNumberHint: number | undefined,
  context: ToolContext
): Promise<TextLocationFinderOutput> {
  context.logger.debug('[ChunkLocationFinder] Tier 1: Plain search on chunk');
  return await fuzzyTextLocatorTool.execute(
    {
      documentText: chunkText,
      searchText,
      lineNumberHint,
      options: {
        normalizeQuotes: true,
        partialMatch: false,
        useLLMFallback: false,
      },
    },
    context
  );
}

/**
 * Tier 2: LLM search on chunk (small input, medium cost)
 */
async function searchChunkWithLLM(
  chunkText: string,
  searchText: string,
  lineNumberHint: number | undefined,
  context: ToolContext
): Promise<TextLocationFinderOutput> {
  context.logger.debug('[ChunkLocationFinder] Tier 2: LLM search on chunk');
  return await fuzzyTextLocatorTool.execute(
    {
      documentText: chunkText,
      searchText,
      lineNumberHint,
      options: {
        normalizeQuotes: true,
        partialMatch: false,
        useLLMFallback: true,
      },
    },
    context
  );
}

/**
 * Tier 3: Plain search on full document (no LLM on large text)
 */
async function searchFullDocumentPlain(
  documentText: string | undefined,
  searchText: string,
  lineNumberHint: number | undefined,
  context: ToolContext
): Promise<TextLocationFinderOutput | null> {
  if (!documentText) {
    context.logger.debug('[ChunkLocationFinder] Tier 3: Skipped (no full document provided)');
    return null;
  }

  context.logger.debug('[ChunkLocationFinder] Tier 3: Plain search on full document');
  return await fuzzyTextLocatorTool.execute(
    {
      documentText,
      searchText,
      lineNumberHint,
      options: {
        normalizeQuotes: true,
        partialMatch: false,
        useLLMFallback: false, // Never use LLM on full document
      },
    },
    context
  );
}

/**
 * Convert chunk-relative location to document-absolute location
 */
function toAbsoluteLocation(
  chunkResult: TextLocationFinderOutput,
  chunkStartOffset: number
): ChunkLocationResult {
  if (!chunkResult.found || !chunkResult.location) {
    return { found: false };
  }

  return {
    found: true,
    location: {
      startOffset: chunkResult.location.startOffset + chunkStartOffset,
      endOffset: chunkResult.location.endOffset + chunkStartOffset,
      quotedText: chunkResult.location.quotedText,
      strategy: `${chunkResult.location.strategy}-chunk`,
      confidence: chunkResult.location.confidence,
    },
  };
}

/**
 * Find text location using optimized 3-tier chunk-based search
 *
 * This function implements an efficient search strategy:
 * 1. Try plain fuzzy search on chunk (fast, free)
 * 2. If failed, try LLM search on chunk (medium cost, chunk is small)
 * 3. If failed, try plain search on full document (no LLM, avoid expensive processing of large text)
 *
 * The key optimization is that LLM only ever processes the small chunk, never the full document.
 */
export async function findLocationInChunk(
  input: ChunkLocationInput,
  context: ToolContext
): Promise<ChunkLocationResult> {
  const { chunkText, fullDocumentText, chunkStartOffset, searchText, lineNumberHint } = input;

  // Tier 1: Plain search on chunk
  const plainResult = await searchChunkPlain(chunkText, searchText, lineNumberHint, context);
  if (plainResult.found) {
    context.logger.debug(`[ChunkLocationFinder] Success at Tier 1: ${plainResult.location?.strategy}`);
    return toAbsoluteLocation(plainResult, chunkStartOffset);
  }

  // Tier 2: LLM search on chunk
  const llmResult = await searchChunkWithLLM(chunkText, searchText, lineNumberHint, context);
  if (llmResult.found) {
    context.logger.debug(`[ChunkLocationFinder] Success at Tier 2: ${llmResult.location?.strategy}`);
    return toAbsoluteLocation(llmResult, chunkStartOffset);
  }

  // Tier 3: Plain search on full document
  const fullDocResult = await searchFullDocumentPlain(fullDocumentText, searchText, lineNumberHint, context);
  if (fullDocResult?.found && fullDocResult.location) {
    context.logger.debug(`[ChunkLocationFinder] Success at Tier 3: ${fullDocResult.location.strategy}`);
    return {
      found: true,
      location: fullDocResult.location,
    };
  }

  // All tiers failed
  context.logger.debug('[ChunkLocationFinder] All tiers failed');
  return { found: false };
}
