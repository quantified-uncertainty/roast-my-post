/**
 * Severity calibration and context-aware adjustment utilities
 *
 * This module implements the severity calibration logic based on:
 * - Document genre (blog post vs research paper)
 * - Claim type (descriptive vs normative vs personal)
 * - Hedging markers ("I think", "probably", etc.)
 * - Adversarial confidence (is this deliberate manipulation?)
 * - Centrality (how important to the core argument?)
 */

import { ClaimType, DocumentGenre, ExtractedEpistemicIssue } from './types.js';

/**
 * Genre-based severity adjustment factors
 * Lower factor = more lenient standards
 */
export const GENRE_ADJUSTMENTS: Record<DocumentGenre, number> = {
  [DocumentGenre.BLOG_POST]: 0.6,        // Personal blog: more lenient
  [DocumentGenre.FORUM_POST]: 0.7,       // EA Forum: somewhat lenient
  [DocumentGenre.POLICY_BRIEF]: 0.8,     // Professional: moderately strict
  [DocumentGenre.RESEARCH_REPORT]: 1.0,  // Research: full standards
  [DocumentGenre.ACADEMIC_PAPER]: 1.1,   // Academic: strictest
};

/**
 * Claim-type based severity adjustments
 * Applied after considering hedging
 */
export const CLAIM_TYPE_ADJUSTMENTS: Record<ClaimType, {
  baseAdjustment: number;
  hedgingDiscount: number;
}> = {
  [ClaimType.DESCRIPTIVE]: {
    baseAdjustment: 1.0,      // Full severity for empirical claims
    hedgingDiscount: 0.3,     // Moderate discount for hedged empirical claims
  },
  [ClaimType.NORMATIVE]: {
    baseAdjustment: 0.7,      // More lenient for value judgments
    hedgingDiscount: 0.4,     // Larger discount when values are hedged
  },
  [ClaimType.PERSONAL]: {
    baseAdjustment: 0.5,      // Very lenient for personal beliefs
    hedgingDiscount: 0.6,     // Huge discount for hedged personal beliefs
  },
  [ClaimType.RHETORICAL]: {
    baseAdjustment: 0.4,      // Lenient for rhetorical emphasis
    hedgingDiscount: 0.5,     // Moderate discount for hedged rhetoric
  },
};

/**
 * Hedging indicators (case-insensitive)
 */
const HEDGING_INDICATORS = [
  'i think',
  'i believe',
  'i suspect',
  'my impression',
  'my intuition',
  'probably',
  'likely',
  'possibly',
  'might',
  'may',
  'could',
  'seems',
  'appears',
  'in my view',
  'in my opinion',
  'i would guess',
  'i might be wrong',
  'i could be wrong',
  'roughly',
  'approximately',
  'around',
  'about',
];

/**
 * Adversarial intent indicators (strong language suggesting manipulation)
 */
const ADVERSARIAL_INDICATORS = {
  high: [
    'they don\'t want you to know',
    'what they won\'t tell you',
    'hidden truth',
    'secret',
    'cover-up',
    'they\'re lying',
  ],
  medium: [
    'big pharma',
    'mainstream media',
    'wall street elites',
    'the establishment',
  ],
};

/**
 * Detect if text contains hedging markers
 */
export function detectHedging(text: string): boolean {
  const lowerText = text.toLowerCase();
  return HEDGING_INDICATORS.some(indicator => lowerText.includes(indicator));
}

/**
 * Assess adversarial confidence (0-100)
 * Higher score = more confident this is deliberate manipulation
 */
export function assessAdversarialConfidence(
  text: string,
  reasoning: string
): number {
  const lowerText = text.toLowerCase();
  const lowerReasoning = reasoning.toLowerCase();

  let confidence = 0;

  // Check for high-confidence adversarial indicators
  for (const indicator of ADVERSARIAL_INDICATORS.high) {
    if (lowerText.includes(indicator) || lowerReasoning.includes(indicator)) {
      confidence = Math.max(confidence, 80);
    }
  }

  // Check for medium-confidence adversarial indicators
  for (const indicator of ADVERSARIAL_INDICATORS.medium) {
    if (lowerText.includes(indicator) || lowerReasoning.includes(indicator)) {
      confidence = Math.max(confidence, 50);
    }
  }

  // Hedging reduces adversarial confidence
  if (detectHedging(text)) {
    confidence *= 0.5;
  }

  // If reasoning mentions "deceptive" or "manipulation" without strong evidence,
  // reduce confidence
  if (lowerReasoning.includes('deceptive') || lowerReasoning.includes('manipulat')) {
    if (confidence < 40) {
      confidence = Math.min(confidence, 30); // Cap at low confidence
    }
  }

  return Math.round(confidence);
}

/**
 * Classify claim type based on text content
 * This is a heuristic classification - could be enhanced with LLM in future
 */
export function classifyClaimType(text: string): ClaimType {
  const lowerText = text.toLowerCase();

  // Personal indicators
  const personalIndicators = ['i think', 'i believe', 'my', 'i have', 'i feel', 'in my experience'];
  if (personalIndicators.some(ind => lowerText.includes(ind))) {
    return ClaimType.PERSONAL;
  }

  // Normative indicators
  const normativeIndicators = ['should', 'ought', 'must', 'only viable', 'justified', 'wrong', 'right', 'moral', 'ethical'];
  if (normativeIndicators.some(ind => lowerText.includes(ind))) {
    return ClaimType.NORMATIVE;
  }

  // Rhetorical indicators
  const rhetoricalIndicators = ['bet the lives', 'destroy', 'catastroph', 'future of humanity'];
  if (rhetoricalIndicators.some(ind => lowerText.includes(ind))) {
    return ClaimType.RHETORICAL;
  }

  // Default to descriptive
  return ClaimType.DESCRIPTIVE;
}

/**
 * Estimate centrality score (how important to core argument)
 * Higher score = more central to the document's main claims
 *
 * This is a simple heuristic - could be enhanced with more context
 */
export function estimateCentrality(
  text: string,
  importanceScore: number
): number {
  const lowerText = text.toLowerCase();

  let centrality = importanceScore; // Start with importance score

  // Core argument indicators increase centrality
  const coreIndicators = [
    'therefore',
    'thus',
    'main',
    'key',
    'core',
    'central',
    'fundamental',
    'primary',
    'most important',
  ];

  if (coreIndicators.some(ind => lowerText.includes(ind))) {
    centrality = Math.min(100, centrality * 1.2);
  }

  // Supporting detail indicators decrease centrality
  const supportingIndicators = [
    'for example',
    'footnote',
    'aside',
    'incidentally',
    'by the way',
  ];

  if (supportingIndicators.some(ind => lowerText.includes(ind))) {
    centrality = Math.max(0, centrality * 0.7);
  }

  return Math.round(centrality);
}

/**
 * Calculate adjusted severity score based on context
 *
 * Formula:
 * adjusted_severity = base_severity
 *   × genre_adjustment
 *   × claim_type_adjustment
 *   × (1 - hedging_discount) [if hedged]
 *   × adversarial_factor [if low adversarial confidence]
 */
export function calculateAdjustedSeverity(
  issue: ExtractedEpistemicIssue,
  genre: DocumentGenre = DocumentGenre.FORUM_POST
): number {
  const {
    severityScore,
    claimType = ClaimType.DESCRIPTIVE,
    hasHedging = false,
    adversarialConfidence = 0,
  } = issue;

  // Start with base severity
  let adjusted = severityScore;

  // Apply genre adjustment
  adjusted *= GENRE_ADJUSTMENTS[genre];

  // Apply claim type adjustment
  const claimAdj = CLAIM_TYPE_ADJUSTMENTS[claimType];
  adjusted *= claimAdj.baseAdjustment;

  // Apply hedging discount if present
  if (hasHedging) {
    adjusted *= (1 - claimAdj.hedgingDiscount);
  }

  // Reduce severity if labeled "deceptive" but low adversarial confidence
  if (adversarialConfidence < 40) {
    const isLabeledAdversarial =
      issue.reasoning.toLowerCase().includes('deceptive') ||
      issue.reasoning.toLowerCase().includes('manipulat') ||
      issue.reasoning.toLowerCase().includes('gish gallop') ||
      issue.reasoning.toLowerCase().includes('motte-bailey');

    if (isLabeledAdversarial) {
      // Heavily penalize adversarial labels with low confidence
      adjusted *= 0.5;
    }
  }

  return Math.round(Math.max(0, Math.min(100, adjusted)));
}

/**
 * Calculate priority score for issue ranking
 * Combines adjusted severity and centrality
 */
export function calculatePriorityScore(
  issue: ExtractedEpistemicIssue,
  adjustedSeverity: number
): number {
  const centrality = issue.centralityScore || issue.importanceScore;

  // Priority = sqrt(severity × centrality) to balance both factors
  // This prevents one extremely high score from dominating
  return Math.round(Math.sqrt(adjustedSeverity * centrality));
}

/**
 * Enrich issue with classification and adjusted scores
 */
export function enrichIssue(
  issue: ExtractedEpistemicIssue,
  genre: DocumentGenre = DocumentGenre.FORUM_POST
): ExtractedEpistemicIssue {
  // Add missing fields
  const claimType = issue.claimType || classifyClaimType(issue.exactText);
  const hasHedging = issue.hasHedging ?? detectHedging(issue.exactText);
  const adversarialConfidence = issue.adversarialConfidence ??
    assessAdversarialConfidence(issue.exactText, issue.reasoning);
  const centralityScore = issue.centralityScore ??
    estimateCentrality(issue.exactText, issue.importanceScore);

  const enriched: ExtractedEpistemicIssue = {
    ...issue,
    claimType,
    hasHedging,
    adversarialConfidence,
    centralityScore,
  };

  return enriched;
}
