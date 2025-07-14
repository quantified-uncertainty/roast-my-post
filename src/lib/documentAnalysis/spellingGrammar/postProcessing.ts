import type { SpellingGrammarHighlight } from "./types";
import type { Comment } from "../../../types/documentSchema";
import type { DocumentConventions } from "./detectConventions";
import { logger } from "@/lib/logger";

export interface ErrorGroup {
  errorType: string;
  baseError: string;
  count: number;
  examples: SpellingGrammarHighlight[];
  severity: 'high' | 'medium' | 'low';
}

export interface ProcessedResults {
  consolidatedErrors: ErrorGroup[];
  uniqueErrorCount: number;
  totalErrorCount: number;
  conventionIssues?: {
    description: string;
    examples: string[];
  };
}

/**
 * Group similar errors together
 */
function groupSimilarErrors(
  errors: SpellingGrammarHighlight[]
): Map<string, ErrorGroup> {
  const groups = new Map<string, ErrorGroup>();
  
  errors.forEach(error => {
    // Extract the base error from the highlighted text
    const baseError = error.highlightedText.toLowerCase().trim();
    const errorType = categorizeError(error.description);
    const key = `${errorType}:${baseError}`;
    
    if (groups.has(key)) {
      const group = groups.get(key)!;
      group.count++;
      // Keep up to 5 examples
      if (group.examples.length < 5) {
        group.examples.push(error);
      }
    } else {
      groups.set(key, {
        errorType,
        baseError: error.highlightedText,
        count: 1,
        examples: [error],
        severity: determineSeverity(error.description, errorType)
      });
    }
  });
  
  return groups;
}

/**
 * Categorize error based on description
 */
function categorizeError(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('spelling') || desc.includes('misspell')) {
    return 'spelling';
  } else if (desc.includes('punctuation') || desc.includes('comma') || desc.includes('period') || desc.includes('space after')) {
    return 'punctuation';
  } else if (desc.includes('capital')) {
    return 'capitalization';
  } else if (desc.includes('grammar') || desc.includes('verb') || desc.includes('subject')) {
    return 'grammar';
  } else if (desc.includes('word choice') || desc.includes('word confusion')) {
    return 'word_choice';
  } else if (desc.includes('consistency') || desc.includes('american') || desc.includes('british')) {
    return 'consistency';
  }
  
  return 'other';
}

/**
 * Determine error severity
 */
function determineSeverity(description: string, errorType: string): 'high' | 'medium' | 'low' {
  const desc = description.toLowerCase();
  
  // Low severity: citation formatting, spacing issues
  if (desc.includes('citation') || desc.includes('footnote') || 
      desc.includes('space after') || desc.includes('missing space') ||
      desc.includes('space before citation')) {
    return 'low';
  }
  
  // High severity: actual misspellings, wrong words, significant grammar errors
  if (errorType === 'spelling' && !desc.includes('consistency') && !desc.includes('correct')) {
    return 'high';
  }
  if (errorType === 'grammar' && !desc.includes('style') && !desc.includes('preference')) {
    return 'high';
  }
  if (errorType === 'word_choice' && !desc.includes('archaic') && !desc.includes('less common')) {
    return 'high';
  }
  
  // Medium severity: everything else
  return 'medium';
}

/**
 * Filter out errors that are actually correct based on document conventions
 */
function filterConventionBasedErrors(
  errors: SpellingGrammarHighlight[],
  conventions: DocumentConventions
): SpellingGrammarHighlight[] {
  // Common UK/US spelling variations
  const ukUsVariations = {
    'UK': {
      'correct': ['colour', 'flavour', 'honour', 'labour', 'neighbour', 'behaviour', 
                  'centre', 'theatre', 'metre', 'litre',
                  'organise', 'realise', 'recognise', 'analyse', 'paralyse',
                  'civilisation', 'organisation', 'colonisation', 'optimisation',
                  'defence', 'licence', 'practice', 'programme', 'aeroplane',
                  'sulphur', 'mould', 'plough', 'catalogue', 'dialogue'],
      'verbs': ['colonise', 'optimise', 'maximise', 'minimise', 'standardise']
    },
    'US': {
      'correct': ['color', 'flavor', 'honor', 'labor', 'neighbor', 'behavior',
                  'center', 'theater', 'meter', 'liter',
                  'organize', 'realize', 'recognize', 'analyze', 'paralyze',
                  'civilization', 'organization', 'colonization', 'optimization',
                  'defense', 'license', 'practice', 'program', 'airplane',
                  'sulfur', 'mold', 'plow', 'catalog', 'dialog'],
      'verbs': ['colonize', 'optimize', 'maximize', 'minimize', 'standardize']
    }
  };
  
  return errors.filter(error => {
    const desc = error.description.toLowerCase();
    const text = error.highlightedText.toLowerCase();
    
    // Skip errors that say the spelling is actually correct for the convention
    if (desc.includes('correct') && desc.includes(conventions.language)) {
      return false;
    }
    
    // Skip UK/US variations that match the document convention
    if (conventions.language === 'UK' || conventions.language === 'US') {
      const variations = ukUsVariations[conventions.language];
      if (variations.correct.includes(text) || variations.verbs.includes(text)) {
        logger.info(`Filtering out ${text} as correct for ${conventions.language} English`);
        return false;
      }
    }
    
    // Skip citation/footnote formatting in academic documents
    if (conventions.documentType === 'academic' && 
        (desc.includes('citation') || desc.includes('footnote') || 
         desc.includes('space before citation') || desc.includes('space after footnote'))) {
      return false;
    }
    
    // Skip style preferences that aren't actual errors
    if (desc.includes('archaic') || desc.includes('less common') || 
        desc.includes('style preference') || desc.includes('markdown formatting')) {
      return false;
    }
    
    return true;
  });
}

/**
 * Detect if there are spelling convention issues
 */
function detectConventionIssues(
  errorGroups: Map<string, ErrorGroup>,
  conventions: DocumentConventions
): { description: string; examples: string[] } | undefined {
  const consistencyErrors = Array.from(errorGroups.values())
    .filter(group => group.errorType === 'consistency');
  
  if (consistencyErrors.length > 0 && conventions.language === 'mixed') {
    const examples = consistencyErrors
      .flatMap(group => group.examples)
      .slice(0, 5)
      .map(ex => ex.highlightedText);
    
    return {
      description: "Document uses mixed US/UK spelling conventions. Consider choosing one convention and applying it consistently throughout.",
      examples
    };
  }
  
  return undefined;
}

/**
 * Post-process errors to group similar ones and create consolidated feedback
 */
export function postProcessErrors(
  allErrors: SpellingGrammarHighlight[],
  conventions: DocumentConventions
): ProcessedResults {
  logger.info(`Post-processing ${allErrors.length} total errors`);
  
  // Filter out false positives based on conventions
  const filteredErrors = filterConventionBasedErrors(allErrors, conventions);
  logger.info(`Filtered to ${filteredErrors.length} errors after convention check`);
  
  // Group similar errors
  const errorGroups = groupSimilarErrors(filteredErrors);
  
  // Detect convention issues
  const conventionIssues = detectConventionIssues(errorGroups, conventions);
  
  // Convert to array and sort by count (most common first) and severity
  const consolidatedErrors = Array.from(errorGroups.values())
    .sort((a, b) => {
      // First by severity
      const severityOrder = { high: 0, medium: 1, low: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // Then by count
      return b.count - a.count;
    });
  
  const uniqueErrorCount = consolidatedErrors.length;
  const totalErrorCount = allErrors.length;
  
  logger.info(`Consolidated ${totalErrorCount} errors into ${uniqueErrorCount} unique error groups`);
  
  return {
    consolidatedErrors,
    uniqueErrorCount,
    totalErrorCount,
    conventionIssues
  };
}

/**
 * Get emoji indicator based on error severity and type
 */
function getErrorEmoji(severity: 'high' | 'medium' | 'low', errorType: string): string {
  // High severity - critical errors that must be fixed
  if (severity === 'high') {
    if (errorType === 'spelling') return '🔴';  // Red circle for misspellings
    if (errorType === 'grammar') return '❌';   // X mark for grammar errors
    if (errorType === 'word_choice') return '⚠️'; // Warning for wrong words
    return '‼️'; // Double exclamation for other high severity
  }
  
  // Medium severity - should be fixed but not critical
  if (severity === 'medium') {
    if (errorType === 'capitalization') return '🔤'; // Letter blocks for capitalization
    if (errorType === 'punctuation') return '📍';   // Pin for punctuation placement
    if (errorType === 'consistency') return '🔄';   // Arrows for consistency
    return '⚡'; // Lightning for other medium severity
  }
  
  // Low severity - minor issues, style preferences
  if (errorType === 'punctuation' && severity === 'low') return '💭'; // Thought bubble for spacing
  if (errorType === 'other') return '💡'; // Light bulb for suggestions
  return '📌'; // Pushpin for other low severity
}

/**
 * Get error type label for inline format
 */
function getErrorTypeLabel(errorType: string): string {
  switch (errorType) {
    case 'spelling':
      return 'Spelling';
    case 'grammar':
      return 'Grammar';
    case 'punctuation':
      return 'Punctuation';
    case 'capitalization':
      return 'Capitalization';
    case 'word_choice':
      return 'Word choice';
    case 'consistency':
      return 'Consistency';
    case 'other':
      return 'Style';
    default:
      return 'Error';
  }
}

/**
 * Clean up error description from LLM
 * - Remove redundant "error:" phrases
 * - Capitalize sentences
 * - Add newline before "Suggested correction"
 */
function cleanErrorDescription(description: string, errorType: string): string {
  // Remove redundant error type mentions at the start
  const redundantPhrases = [
    `${errorType} error:`,
    `${errorType}:`,
    'Spelling error:',
    'Grammar error:',
    'Punctuation error:',
    'Capitalization error:',
    'Word choice error:',
    'Consistency issue:',
    'Style issue:'
  ];
  
  let cleaned = description;
  for (const phrase of redundantPhrases) {
    if (cleaned.toLowerCase().startsWith(phrase.toLowerCase())) {
      cleaned = cleaned.substring(phrase.length).trim();
      break;
    }
  }
  
  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  // Add period if missing at the end of first sentence (before "Suggested")
  if (cleaned.includes('Suggested correction:')) {
    const parts = cleaned.split('Suggested correction:');
    let firstPart = parts[0].trim();
    if (!firstPart.endsWith('.') && !firstPart.endsWith('!') && !firstPart.endsWith('?')) {
      firstPart += '.';
    }
    // Add newline before suggestion and capitalize
    cleaned = firstPart + '\nSuggested correction: ' + parts[1].trim().charAt(0).toUpperCase() + parts[1].trim().slice(1);
  } else {
    // Add period at end if missing
    if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
      cleaned += '.';
    }
  }
  
  return cleaned;
}

/**
 * Create a consolidated comment for an error group
 */
export function createConsolidatedComment(
  group: ErrorGroup,
  baseOffset: number = 0
): Comment[] {
  const emoji = getErrorEmoji(group.severity, group.errorType);
  
  if (group.count <= 2) {
    // For 1-2 occurrences, return individual comments with emoji and formatted description
    return group.examples.map((example, index) => {
      // Create inline format with emoji and type label
      const typeLabel = getErrorTypeLabel(group.errorType);
      const cleanedDescription = cleanErrorDescription(example.description, group.errorType);
      const formattedDescription = `${emoji} ${typeLabel}: ${cleanedDescription}`;
      
      return {
        description: formattedDescription,
        importance: group.severity === 'high' ? 8 : group.severity === 'medium' ? 5 : 3,
        grade: group.severity === 'high' ? 20 : group.severity === 'medium' ? 40 : 60,
        highlight: {
          startOffset: baseOffset, // This will be calculated properly by the caller
          endOffset: baseOffset + example.highlightedText.length,
          quotedText: example.highlightedText,
          isValid: true
        },
        isValid: true
      };
    });
  }
  
  // For 3+ occurrences, create a consolidated comment with inline format
  const typeLabel = getErrorTypeLabel(group.errorType);
  const cleanedDescription = cleanErrorDescription(group.examples[0].description, group.errorType);
  const description = `${emoji} ${typeLabel} (${group.count}x): ${cleanedDescription}`;
  
  // Return just the first occurrence with a note about repetitions
  return [{
    description,
    importance: group.severity === 'high' ? 9 : group.severity === 'medium' ? 6 : 4,
    grade: group.severity === 'high' ? 15 : group.severity === 'medium' ? 35 : 55,
    highlight: {
      startOffset: baseOffset,
      endOffset: baseOffset + group.examples[0].highlightedText.length,
      quotedText: group.examples[0].highlightedText,
      isValid: true
    },
    isValid: true
  }];
}

/**
 * Calculate grade based on unique errors and severity
 */
export function calculateSmartGrade(
  processedResults: ProcessedResults,
  wordCount: number
): number {
  let penaltyPoints = 0;
  
  // Calculate penalty based on unique errors and their severity
  processedResults.consolidatedErrors.forEach(group => {
    // More aggressive penalties for high-severity errors
    const severityMultiplier = 
      group.severity === 'high' ? 5 :      // Increased from 3
      group.severity === 'medium' ? 2.5 : 1;  // Increased from 2
    
    // Less diminishing returns - count more occurrences
    const countPenalty = Math.min(group.count, 10); // Increased from 5
    
    // Apply a multiplier for frequently repeated errors
    const frequencyMultiplier = group.count > 5 ? 1.5 : 1;
    
    penaltyPoints += severityMultiplier * countPenalty * frequencyMultiplier;
  });
  
  // Add penalty for convention issues
  if (processedResults.conventionIssues) {
    penaltyPoints += 15; // Increased from 10
  }
  
  // Scale penalty by document length
  const errorDensity = penaltyPoints / (wordCount / 100);
  
  // More aggressive grading curve
  // Start at 100, subtract based on error density with a steeper curve
  const grade = Math.max(0, Math.round(100 - errorDensity * 3)); // Increased multiplier from 2
  
  // Additional penalty for high unique error count
  const uniqueErrorPenalty = processedResults.uniqueErrorCount > 50 ? 5 : 
                            processedResults.uniqueErrorCount > 30 ? 3 : 0;
  
  const finalGrade = Math.max(0, grade - uniqueErrorPenalty);
  
  logger.info(`Calculated smart grade: ${finalGrade} (${penaltyPoints} penalty points, ${wordCount} words, ${processedResults.uniqueErrorCount} unique errors)`);
  
  return finalGrade;
}