import type { SpellingGrammarError } from "@/tools/check-spelling-grammar";
import type { SpellingErrorWithLocation } from "./index";

/**
 * Generate a comment for a single spelling/grammar error
 */
export function generateSpellingComment(error: SpellingGrammarError): string {
  const parts: string[] = [];
  
  // Start with error type
  const typeLabel = error.type.charAt(0).toUpperCase() + error.type.slice(1);
  parts.push(`**${typeLabel}**:`);
  
  // Show the correction
  parts.push(`"${error.text}" → "${error.correction}"`);
  
  // Add context if available
  if (error.context && error.context.length > error.text.length + 10) {
    parts.push(`\n\nContext: *...${error.context}...*`);
  }
  
  return parts.join(" ");
}

/**
 * Generate a summary of all spelling/grammar errors in the document
 */
export function generateDocumentSummary(errors: SpellingErrorWithLocation[]): string {
  if (errors.length === 0) {
    return "No spelling or grammar errors were found in this document.";
  }
  
  const sections: string[] = [];
  
  // Overview
  sections.push(`## Spelling & Grammar Analysis\n`);
  sections.push(`Found ${errors.length} issues in this document.\n`);
  
  // Break down by type
  const errorsByType = {
    spelling: errors.filter(e => e.error.type === 'spelling'),
    grammar: errors.filter(e => e.error.type === 'grammar'),
  };
  
  // Spelling errors section
  if (errorsByType.spelling.length > 0) {
    sections.push(`\n### Spelling Errors (${errorsByType.spelling.length})\n`);
    
    const examples = errorsByType.spelling.slice(0, 5);
    for (const example of examples) {
      sections.push(`- "${example.error.text}" → "${example.error.correction}"`);
    }
    
    if (errorsByType.spelling.length > 5) {
      sections.push(`\n...and ${errorsByType.spelling.length - 5} more spelling errors.`);
    }
  }
  
  // Grammar errors section
  if (errorsByType.grammar.length > 0) {
    sections.push(`\n### Grammar Errors (${errorsByType.grammar.length})\n`);
    
    const examples = errorsByType.grammar.slice(0, 5);
    for (const example of examples) {
      sections.push(`- "${example.error.text}" → "${example.error.correction}"`);
      if (example.error.context) {
        sections.push(`  - Context: *${example.error.context}*`);
      }
    }
    
    if (errorsByType.grammar.length > 5) {
      sections.push(`\n...and ${errorsByType.grammar.length - 5} more grammar errors.`);
    }
  }
  
  // Summary and recommendations
  sections.push(`\n### Summary\n`);
  
  if (errors.length > 20) {
    sections.push(`⚠️ This document has numerous spelling and grammar issues that should be addressed.`);
    sections.push(`\nConsider using a grammar checking tool or having the document proofread.`);
  } else if (errors.length > 10) {
    sections.push(`The document has a moderate number of errors that could impact readability.`);
  } else {
    sections.push(`The document has relatively few errors and is generally well-written.`);
  }
  
  // Common patterns
  const commonMisspellings = findCommonPatterns(errors);
  if (commonMisspellings.length > 0) {
    sections.push(`\n### Common Patterns\n`);
    for (const pattern of commonMisspellings) {
      sections.push(`- ${pattern}`);
    }
  }
  
  return sections.join("\n");
}

/**
 * Find common patterns in spelling errors
 */
function findCommonPatterns(errors: SpellingErrorWithLocation[]): string[] {
  const patterns: string[] = [];
  
  // Group errors by similar corrections
  const errorGroups = new Map<string, number>();
  
  for (const error of errors) {
    if (error.error.type === 'spelling') {
      // Look for common misspelling patterns
      const key = `${error.error.text} → ${error.error.correction}`;
      errorGroups.set(key, (errorGroups.get(key) || 0) + 1);
    }
  }
  
  // Find repeated errors
  const repeated = Array.from(errorGroups.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);
  
  if (repeated.length > 0) {
    patterns.push(`Repeated misspellings found:`);
    for (const [error, count] of repeated.slice(0, 3)) {
      patterns.push(`  - "${error}" (${count} occurrences)`);
    }
  }
  
  // Check for common spelling patterns
  const spellingErrors = errors.filter(e => e.error.type === 'spelling');
  
  // Their/there/they're confusion
  const homophones = spellingErrors.filter(e => 
    (e.error.text.toLowerCase().includes('their') || 
     e.error.text.toLowerCase().includes('there') || 
     e.error.text.toLowerCase().includes('theyre')) &&
    (e.error.correction.toLowerCase().includes('their') || 
     e.error.correction.toLowerCase().includes('there') || 
     e.error.correction.toLowerCase().includes("they're"))
  );
  
  if (homophones.length > 0) {
    patterns.push(`Confusion with their/there/they're found ${homophones.length} time${homophones.length > 1 ? 's' : ''}`);
  }
  
  // Its/it's confusion
  const itsConfusion = spellingErrors.filter(e => 
    (e.error.text.toLowerCase() === 'its' && e.error.correction.toLowerCase() === "it's") ||
    (e.error.text.toLowerCase() === "it's" && e.error.correction.toLowerCase() === "its")
  );
  
  if (itsConfusion.length > 0) {
    patterns.push(`Confusion with its/it's found ${itsConfusion.length} time${itsConfusion.length > 1 ? 's' : ''}`);
  }
  
  return patterns;
}