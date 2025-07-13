/**
 * Spelling and Grammar Analysis Module
 * 
 * This module provides functionality for analyzing documents for spelling and grammar errors.
 * It divides documents into chunks, analyzes each chunk with an LLM, and returns
 * highlights with precise line numbers and error descriptions.
 */

export { analyzeChunk } from "./analyzeChunk";
export { convertHighlightsToComments, validateConvertedHighlights } from "./highlightConverter";
export type { 
  ChunkWithLineNumbers, 
  SpellingGrammarHighlight,
  AgentContext 
} from "./types";