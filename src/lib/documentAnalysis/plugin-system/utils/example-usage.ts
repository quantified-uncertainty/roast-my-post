/**
 * Example showing how to use the utility functions directly
 * instead of relying on BasePlugin inheritance
 */

import type { 
  PotentialFinding, 
  InvestigatedFinding
} from '../types';
import type { Comment } from '@/types/documentSchema';

import { 
  generateFindingId, 
  investigateFindings, 
  createPluginError 
} from './findingHelpers';

import { 
  generateCommentsFromFindings,
  filterRepetitiveComments,
  type GenerateCommentsContext
} from './commentGenerator';

import { logger } from '../../../logger';

/**
 * Example of processing findings without BasePlugin
 */
export function processMathFindings(
  equations: Array<{ text: string; error?: string; chunkId: string }>,
  pluginName: string
): PotentialFinding[] {
  const potentialFindings: PotentialFinding[] = [];
  
  equations.forEach(eq => {
    if (eq.error) {
      potentialFindings.push({
        id: generateFindingId(pluginName, 'math-error'),
        type: 'math_error',
        data: {
          equation: eq.text,
          error: eq.error
        },
        highlightHint: {
          searchText: eq.text,
          chunkId: eq.chunkId
        }
      });
    }
  });
  
  return potentialFindings;
}

/**
 * Example of investigating findings
 */
export function investigateMathFindings(
  potentials: PotentialFinding[]
): InvestigatedFinding[] {
  return investigateFindings(potentials, (finding) => {
    const data = finding.data as { equation: string; error: string };
    return {
      severity: 'medium' as const,
      message: `Mathematical error in "${data.equation}": ${data.error}`
    };
  });
}

/**
 * Example of generating comments
 */
export function generateMathComments(
  investigated: InvestigatedFinding[],
  context: GenerateCommentsContext
): Comment[] {
  try {
    const { comments, located, dropped } = generateCommentsFromFindings(
      investigated,
      context,
      {
        fuzzyMatch: true,
        requireHighConfidence: false
      }
    );
    
    if (dropped > 0) {
      logger.info(`Dropped ${dropped} math findings that couldn't be located`);
    }
    
    // Filter repetitive errors if needed
    return filterRepetitiveComments(comments, {
      maxInstancesPerError: 2,
      groupByField: (c) => {
        // Group by the equation text
        const match = c.description.match(/"([^"]+)"/);
        return match ? match[1].toLowerCase() : c.description.toLowerCase();
      }
    });
  } catch (error) {
    const pluginError = createPluginError('generateComments', error);
    logger.error('Error generating math comments', pluginError);
    return [];
  }
}

/**
 * Complete example workflow
 */
export function exampleWorkflow(
  equations: Array<{ text: string; error?: string; chunkId: string }>,
  documentText: string
): Comment[] {
  // Step 1: Create potential findings
  const potentials = processMathFindings(equations, 'MATH');
  
  // Step 2: Investigate them (add severity and messages)
  const investigated = investigateMathFindings(potentials);
  
  // Step 3: Generate comments with locations
  const comments = generateMathComments(investigated, {
    documentText,
    maxComments: 30,
    minImportance: 3
  });
  
  return comments;
}