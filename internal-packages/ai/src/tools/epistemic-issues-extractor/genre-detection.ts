/**
 * Genre detection utilities
 *
 * Automatically detects document genre based on content, structure, and metadata
 */

import { DocumentGenre } from './types';

interface GenreSignals {
  personal: number;
  formal: number;
  academic: number;
  conversational: number;
}

/**
 * Detect document genre from text
 *
 * Uses heuristics based on:
 * - Language style (first-person vs third-person)
 * - Formality markers
 * - Structure indicators
 * - Citation patterns
 */
export function detectGenre(documentText: string): DocumentGenre {
  // Sample beginning and end of document (first 2000 and last 1000 chars)
  const beginning = documentText.slice(0, 2000).toLowerCase();
  const end = documentText.slice(-1000).toLowerCase();
  const fullLower = documentText.toLowerCase();

  const signals: GenreSignals = {
    personal: 0,
    formal: 0,
    academic: 0,
    conversational: 0,
  };

  // Personal indicators
  const personalIndicators = [
    'i think',
    'i believe',
    'my view',
    'my opinion',
    'in my experience',
    'i\'ve been',
    'i was',
    'i am',
  ];

  for (const indicator of personalIndicators) {
    const count = (fullLower.match(new RegExp(indicator, 'g')) || []).length;
    signals.personal += count;
  }

  // Conversational indicators
  const conversationalIndicators = [
    'you might',
    'you can',
    'let\'s',
    'here\'s',
    'there\'s',
    'what\'s',
  ];

  for (const indicator of conversationalIndicators) {
    if (fullLower.includes(indicator)) {
      signals.conversational += 2;
    }
  }

  // Academic indicators
  const academicIndicators = [
    'abstract',
    'methodology',
    'et al',
    'ibid',
    'op cit',
    'p < 0.05',
    'statistically significant',
    'correlation coefficient',
    'regression analysis',
  ];

  for (const indicator of academicIndicators) {
    if (fullLower.includes(indicator)) {
      signals.academic += 5;
    }
  }

  // Formal citation patterns
  const citationPatterns = [
    /\(\d{4}\)/g,              // (2020)
    /\[\d+\]/g,                // [1], [2]
    /\w+ et al\./g,            // Smith et al.
    /doi:/g,                   // DOI:
  ];

  for (const pattern of citationPatterns) {
    const matches = fullLower.match(pattern);
    if (matches) {
      signals.academic += matches.length;
      signals.formal += matches.length * 0.5;
    }
  }

  // Formal language indicators
  const formalIndicators = [
    'therefore',
    'furthermore',
    'moreover',
    'consequently',
    'notwithstanding',
    'whereas',
    'hereby',
    'pursuant to',
  ];

  for (const indicator of formalIndicators) {
    if (fullLower.includes(indicator)) {
      signals.formal += 1;
    }
  }

  // Check for research paper structure
  if (
    beginning.includes('abstract') &&
    (fullLower.includes('introduction') || fullLower.includes('background')) &&
    (fullLower.includes('methodology') || fullLower.includes('methods')) &&
    (fullLower.includes('results') || fullLower.includes('findings')) &&
    (fullLower.includes('discussion') || fullLower.includes('conclusion'))
  ) {
    signals.academic += 20;
  }

  // Check for policy brief markers
  const policyMarkers = [
    'executive summary',
    'policy recommendation',
    'key findings',
    'implementation',
    'stakeholder',
  ];

  let policyScore = 0;
  for (const marker of policyMarkers) {
    if (fullLower.includes(marker)) {
      policyScore += 3;
    }
  }

  // Check for blog/forum markers
  const blogMarkers = [
    'cross-post',
    'update:',
    'edit:',
    'tldr',
    'tl;dr',
  ];

  let blogScore = 0;
  for (const marker of blogMarkers) {
    if (beginning.includes(marker) || end.includes(marker)) {
      blogScore += 5;
    }
  }

  // Decision logic
  if (signals.academic > 15) {
    return DocumentGenre.ACADEMIC_PAPER;
  }

  if (policyScore > 6 && signals.formal > 5) {
    return DocumentGenre.POLICY_BRIEF;
  }

  if (signals.formal > 10 && signals.personal < 5) {
    return DocumentGenre.RESEARCH_REPORT;
  }

  if (blogScore > 5 || signals.personal > 10) {
    // Distinguish between personal blog and forum post
    const hasForumMarkers =
      fullLower.includes('lesswrong') ||
      fullLower.includes('effective altruism') ||
      fullLower.includes('ea forum') ||
      fullLower.includes('alignment forum');

    return hasForumMarkers ? DocumentGenre.FORUM_POST : DocumentGenre.BLOG_POST;
  }

  if (signals.conversational > 5 && signals.personal > 5) {
    return DocumentGenre.BLOG_POST;
  }

  // Default to forum post for mixed/unclear cases
  return DocumentGenre.FORUM_POST;
}

/**
 * Get genre display name
 */
export function getGenreDisplayName(genre: DocumentGenre): string {
  const names: Record<DocumentGenre, string> = {
    [DocumentGenre.BLOG_POST]: 'Blog Post',
    [DocumentGenre.FORUM_POST]: 'Forum Post',
    [DocumentGenre.RESEARCH_REPORT]: 'Research Report',
    [DocumentGenre.POLICY_BRIEF]: 'Policy Brief',
    [DocumentGenre.ACADEMIC_PAPER]: 'Academic Paper',
  };
  return names[genre];
}

/**
 * Get genre description for user feedback
 */
export function getGenreDescription(genre: DocumentGenre): string {
  const descriptions: Record<DocumentGenre, string> = {
    [DocumentGenre.BLOG_POST]:
      'Personal blog post with informal tone - epistemic standards are more lenient',
    [DocumentGenre.FORUM_POST]:
      'Forum/community post - moderate epistemic standards for thoughtful discussion',
    [DocumentGenre.RESEARCH_REPORT]:
      'Research report or white paper - high epistemic standards expected',
    [DocumentGenre.POLICY_BRIEF]:
      'Policy brief or professional document - high standards with some flexibility',
    [DocumentGenre.ACADEMIC_PAPER]:
      'Academic paper - strictest epistemic standards applied',
  };
  return descriptions[genre];
}
