/**
 * Spelling and Grammar Analysis Module
 * 
 * This module provides functionality for analyzing documents for spelling and grammar errors.
 * It uses a clean architecture with separated domain, application, infrastructure, and workflow layers.
 */

import { SpellingGrammarWorkflow } from './workflows';
import type { WorkflowOptions } from './workflows';
import type { Agent } from '../../../types/agentSchema';
import type { Document } from '../../../types/documents';

// Create singleton workflow instance
const workflow = new SpellingGrammarWorkflow();

/**
 * Analyze document for spelling and grammar errors (sequential execution)
 * @deprecated Use analyzeSpellingGrammar with executionMode option instead
 */
export async function analyzeSpellingGrammarDocument(
  document: Document,
  agentInfo: Agent,
  targetHighlights?: number
) {
  return workflow.analyze(document, agentInfo, {
    targetHighlights,
    executionMode: 'sequential'
  });
}

/**
 * Analyze document for spelling and grammar errors (parallel execution)
 * @deprecated Use analyzeSpellingGrammar with executionMode option instead
 */
export async function analyzeSpellingGrammarDocumentParallel(
  document: Document,
  agentInfo: Agent,
  targetHighlights?: number,
  maxConcurrency?: number
) {
  return workflow.analyze(document, agentInfo, {
    targetHighlights,
    executionMode: 'parallel',
    maxConcurrency
  });
}

/**
 * Analyze document for spelling and grammar errors
 * This is the main entry point for the module
 */
export async function analyzeSpellingGrammar(
  document: Document,
  agentInfo: Agent,
  options?: WorkflowOptions
) {
  return workflow.analyze(document, agentInfo, options);
}

// Export types for backwards compatibility
export type { 
  ChunkWithLineNumbers, 
  SpellingGrammarHighlight,
  AgentContext 
} from "./types";

// Export utility functions that might be used externally
export { convertHighlightsToComments, validateConvertedHighlights } from "./highlightConverter";