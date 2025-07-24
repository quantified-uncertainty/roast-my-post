/**
 * Generic utility for finding text within a chunk and converting to document coordinates
 */

import { logger } from "@/lib/logger";
import type { TextChunk } from "../types";
import { findTextLocation, type EnhancedLocationOptions } from "@/lib/documentAnalysis/shared/enhancedTextLocationFinder";

export interface ChunkLocation {
  startOffset: number;  // Relative to chunk
  endOffset: number;    // Relative to chunk
  quotedText: string;
}

export interface DocumentLocation {
  startOffset: number;  // Absolute in document
  endOffset: number;    // Absolute in document
  quotedText: string;
}

/**
 * Find text within a chunk and return chunk-relative position
 */
export async function findTextInChunk(
  searchText: string,
  chunk: TextChunk,
  options: EnhancedLocationOptions = {}
): Promise<ChunkLocation | null> {
  // Always search within the chunk only
  const location = await findTextLocation(searchText, chunk.text, options);
  
  if (!location) {
    return null;
  }
  
  return {
    startOffset: location.startOffset,
    endOffset: location.endOffset,
    quotedText: location.quotedText
  };
}

/**
 * Find text within a chunk and convert to document-absolute position
 */
export async function findTextInChunkAbsolute(
  searchText: string,
  chunk: TextChunk,
  options: EnhancedLocationOptions & { documentText?: string } = {}
): Promise<DocumentLocation | null> {
  // Find within chunk
  const chunkLocation = await findTextInChunk(searchText, chunk, options);
  
  if (!chunkLocation) {
    logger.debug('Text not found in chunk', {
      searchText: searchText.slice(0, 50),
      chunkId: chunk.id,
      plugin: options.pluginName
    });
    return null;
  }
  
  // Validate chunk has position metadata
  if (!chunk.metadata?.position) {
    logger.error('Chunk missing position metadata', { 
      chunkId: chunk.id,
      plugin: options.pluginName 
    });
    return null;
  }
  
  // Convert to absolute position
  const absoluteStart = chunk.metadata.position.start + chunkLocation.startOffset;
  const absoluteEnd = chunk.metadata.position.start + chunkLocation.endOffset;
  
  // Verify the position if document text is provided
  if (options.documentText) {
    const extractedText = options.documentText.substring(absoluteStart, absoluteEnd);
    if (extractedText !== chunkLocation.quotedText) {
      logger.error('Position verification failed - chunk offsets may be incorrect', {
        chunkId: chunk.id,
        chunkStart: chunk.metadata.position.start,
        chunkEnd: chunk.metadata.position.end,
        relativeStart: chunkLocation.startOffset,
        relativeEnd: chunkLocation.endOffset,
        absoluteStart,
        absoluteEnd,
        expectedText: chunkLocation.quotedText.slice(0, 50),
        actualText: extractedText.slice(0, 50),
        plugin: options.pluginName
      });
      
      // Try to find where the chunk actually is in the document
      const actualChunkPos = options.documentText.indexOf(chunk.text);
      if (actualChunkPos !== -1 && actualChunkPos !== chunk.metadata.position.start) {
        logger.error('Chunk position mismatch detected', {
          chunkId: chunk.id,
          declaredStart: chunk.metadata.position.start,
          actualStart: actualChunkPos,
          difference: actualChunkPos - chunk.metadata.position.start,
          plugin: options.pluginName
        });
      }
      
      // Return null to prevent incorrect highlighting
      return null;
    }
  }
  
  logger.debug('Text found in chunk, converted to absolute position', {
    chunkId: chunk.id,
    chunkStart: chunk.metadata.position.start,
    relativeStart: chunkLocation.startOffset,
    absoluteStart,
    plugin: options.pluginName
  });
  
  return {
    startOffset: absoluteStart,
    endOffset: absoluteEnd,
    quotedText: chunkLocation.quotedText
  };
}