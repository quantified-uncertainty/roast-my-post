/**
 * Wrapper to use the document-chunker tool for creating chunks in the plugin system
 */

import documentChunkerTool from '@/tools/document-chunker';
import type { DocumentChunkerInput } from '@/tools/document-chunker';
import { TextChunk } from '../TextChunk';
import { LocationUtils } from '../../documentAnalysis/utils/LocationUtils';
import { logger } from '../../logger';

export interface ChunkingOptions {
  maxChunkSize?: number;
  minChunkSize?: number;
  preserveContext?: boolean;
  // Legacy options for backward compatibility
  chunkSize?: number;
  chunkByParagraphs?: boolean;
  overlap?: number; // Legacy - no longer used
}

/**
 * Create chunks using the intelligent document chunker tool
 * Provides backward compatibility with the old createChunks interface
 */
export async function createChunksWithTool(
  text: string,
  options: ChunkingOptions = {}
): Promise<TextChunk[]> {
  // Map legacy options to new tool options
  const toolInput: DocumentChunkerInput = {
    text,
    maxChunkSize: options.maxChunkSize || options.chunkSize || 1500,
    minChunkSize: options.minChunkSize || 200,
    preserveContext: options.preserveContext ?? true,
  };

  try {
    // Call the chunking tool
    const result = await documentChunkerTool.execute(toolInput, {
      logger,
    });

    // Convert tool output to TextChunk instances
    return result.chunks.map(chunk => {
      // Create location utils for this chunk
      const chunkLocationUtils = new LocationUtils(chunk.text);
      
      return new TextChunk(
        chunk.id,
        chunk.text,
        {
          position: {
            start: chunk.startOffset,
            end: chunk.endOffset,
          },
          lineInfo: {
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            totalLines: chunk.endLine - chunk.startLine + 1,
          },
          // Pass through additional metadata from the tool
          section: chunk.metadata.headingContext?.join(' > '),
          type: chunk.metadata.type,
          confidence: chunk.metadata.confidence,
        } as any
      );
    });
  } catch (error) {
    logger.error('Failed to create chunks with tool, falling back to simple chunking', error);
    
    // Fallback to the original simple chunking
    const { createChunks } = await import('../TextChunk');
    return createChunks(text, {
      chunkSize: options.chunkSize || options.maxChunkSize,
      chunkByParagraphs: options.chunkByParagraphs,
    });
  }
}

/**
 * Synchronous version that returns a promise
 * For use in places that expect the original createChunks signature
 */
export function createChunks(
  text: string,
  options: ChunkingOptions = {}
): TextChunk[] {
  logger.warn('Using synchronous createChunks - consider using createChunksWithTool for better results');
  
  // Import and use the original synchronous version
  const { createChunks: originalCreateChunks } = require('../TextChunk');
  return originalCreateChunks(text, options);
}