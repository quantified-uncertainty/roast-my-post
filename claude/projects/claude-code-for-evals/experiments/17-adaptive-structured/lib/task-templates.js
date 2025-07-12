#!/usr/bin/env node

// Task prompt templates that enforce structured output

const FINDING_FORMAT = `
[FINDING]
Category: [choose one: spelling_grammar | mathematical_error | logical_flaw | factual_error | clarity_issue | structural_problem | missing_content]
Severity: [choose one: critical | major | minor]
Line: [line number]
Quote: "[exact quote from document]"
Issue: [clear description of the problem]
[/FINDING]`;

const BASE_INSTRUCTIONS = `
CRITICAL INSTRUCTIONS FOR OUTPUT FORMAT:
1. Output each finding in the EXACT format shown below
2. Use ONLY the predefined categories and severities
3. Include the EXACT line number where the issue occurs
4. Quote the EXACT text from the document
5. Provide a clear, specific description of the issue

Format for EACH finding:
${FINDING_FORMAT}

Example:
[FINDING]
Category: mathematical_error
Severity: critical
Line: 71
Quote: "The R-square measure of correlation between two sets of data is the same as the cosine of the angle"
Issue: This is incorrect. The correlation coefficient R (not R²) equals the cosine of the angle between centered vectors.
[/FINDING]

IMPORTANT: 
- Output NOTHING except findings in this format
- Do not include any explanatory text outside of findings
- Each finding must be complete and self-contained`;

const taskTemplates = {
  spelling_grammar: {
    name: "Spelling and Grammar Check",
    prompt: `Analyze the document at input.md for spelling errors, typos, and grammatical mistakes.

${BASE_INSTRUCTIONS}

Focus on:
- Spelling errors and typos
- Grammar mistakes
- Punctuation errors
- Sentence structure issues

Severity guide:
- critical: Never use for spelling/grammar
- major: Errors that significantly impact readability
- minor: Small typos or minor grammar issues`
  },

  mathematical_accuracy: {
    name: "Mathematical Accuracy Check",
    prompt: `Analyze the document at input.md for mathematical errors and inaccuracies.

${BASE_INSTRUCTIONS}

Focus on:
- Incorrect equations or formulas
- Calculation errors
- Misuse of mathematical notation
- Incorrect mathematical relationships

Severity guide:
- critical: Fundamental mathematical errors that invalidate arguments
- major: Significant calculation errors or misused concepts
- minor: Notation issues or small computational errors`
  },

  logical_consistency: {
    name: "Logical Consistency Analysis",
    prompt: `Analyze the document at input.md for logical flaws and contradictions.

${BASE_INSTRUCTIONS}

Focus on:
- Self-contradictions
- Logical fallacies
- Invalid reasoning
- Unsupported conclusions

Severity guide:
- critical: Core argument contradictions
- major: Significant logical flaws
- minor: Weak reasoning or minor inconsistencies`
  },

  factual_verification: {
    name: "Factual Accuracy Verification",
    prompt: `Analyze the document at input.md for factual errors and unsupported claims.

${BASE_INSTRUCTIONS}

Focus on:
- Incorrect facts or statistics
- Unsupported claims
- Outdated information
- Misrepresented sources

Severity guide:
- critical: Completely false central claims
- major: Significant factual errors
- minor: Small inaccuracies or outdated info`
  },

  clarity_readability: {
    name: "Clarity and Readability Assessment",
    prompt: `Analyze the document at input.md for clarity and readability issues.

${BASE_INSTRUCTIONS}

Focus on:
- Unclear explanations
- Overly complex language
- Ambiguous statements
- Poor organization

Severity guide:
- critical: Never use for clarity issues
- major: Passages that are very difficult to understand
- minor: Somewhat unclear sections`
  },

  structural_analysis: {
    name: "Document Structure Review",
    prompt: `Analyze the document at input.md for structural and formatting issues.

${BASE_INSTRUCTIONS}

Focus on:
- Missing sections
- Poor organization
- Formatting inconsistencies
- Broken references or links

Severity guide:
- critical: Never use for structural issues
- major: Significant organizational problems
- minor: Small formatting inconsistencies`
  },

  technical_gaps: {
    name: "Technical Completeness Check",
    prompt: `Analyze the document at input.md for missing technical content and explanations.

${BASE_INSTRUCTIONS}

Focus on:
- Undefined terms
- Missing explanations
- Incomplete arguments
- Overlooked edge cases

Severity guide:
- critical: Missing core concepts that invalidate the work
- major: Significant omissions
- minor: Small gaps or missing details`
  }
};

module.exports = {
  taskTemplates,
  FINDING_FORMAT,
  BASE_INSTRUCTIONS
};