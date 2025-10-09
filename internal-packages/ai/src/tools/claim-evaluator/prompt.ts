import type { ClaimEvaluatorInput } from "./utils";

// Constants
export const DEFAULT_EXPLANATION_LENGTH = 50; // Default max words for explanation text

/**
 * Generate the LLM prompt for claim evaluation
 * Exported for preview/debugging purposes
 */
export function generateClaimEvaluatorPrompt(input: Pick<ClaimEvaluatorInput, 'claim' | 'context' | 'explanationLength' | 'runs'>): string {
  const runNote = (input.runs && input.runs > 1)
    ? '\n\nIMPORTANT: You are one of multiple independent evaluators. Provide your honest assessment without trying to match others. Use the full probability scale (0-100) based on your analysis.'
    : '';

  const explanationLength = input.explanationLength || DEFAULT_EXPLANATION_LENGTH;

  return `You are evaluating the factual accuracy of this claim:

"${input.claim}"
${input.context ? `\nContext: ${input.context}` : ''}

## Your Task

Estimate the probability that this claim is TRUE (factually accurate), not whether you personally agree with it.

**Think step-by-step before responding:**
1. What is the base rate? (How often are claims like this true in general?)
2. What specific evidence supports or contradicts this claim?
3. Are there temporal factors? (Was it true then? Is it true now? Will it be true?)
4. How would you break down complex claims into component parts?
5. What is your overall probability estimate, and how confident are you in that estimate?

## Probability Scale (0-100)

- **0-10**: Almost certainly false
- **20-30**: Probably false
- **40-60**: Uncertain / toss-up (use this range when genuinely unsure)
- **70-80**: Probably true
- **90-100**: Almost certainly true

**Calibration reminder**: Use the FULL scale. Avoid clustering around 50 or 90-100. Be appropriately uncertain when evidence is limited.

## Confidence Scale (0-100)

Confidence = How sure are you of your probability estimate?
- **100**: Absolutely certain of this probability (rare - requires definitive proof)
- **70-90**: High confidence (strong evidence, clear reasoning)
- **40-60**: Moderate confidence (some uncertainty remains)
- **0-30**: Low confidence (limited information, high uncertainty)

Note: You can have 60% probability with 90% confidence, OR 60% probability with 30% confidence. These are independent dimensions.

${input.context ? '\n## Context Considerations\n\nThe provided context may include temporal information (when the claim was made), domain knowledge, or situational details. Factor these into your base rate and evidence assessment.\n' : ''}${runNote}

## Refusal Options

If you cannot or should not evaluate this claim, use one of these refusal reasons:
- **"Unclear"**: The claim is too vague, ambiguous, or imprecise to evaluate meaningfully
- **"MissingData"**: Insufficient information or data to make an informed assessment
- **"Policy"**: Against your policies or rules to evaluate
- **"Safety"**: Evaluating this claim could be harmful or dangerous

## Response Format

CRITICAL: Respond with ONLY a JSON object. No explanatory text before or after.

**For normal evaluation:**
{
  "agreement": 75,
  "confidence": 85,
  "reasoning": "Step-by-step reasoning (max ${explanationLength} words): Base rate ~70% for scientific consensus claims. Strong peer-reviewed evidence supports this. No significant contradicting evidence. Temporal factors not relevant. Final estimate: 75% with high confidence."
}

**For refusal:**
{
  "refusalReason": "Unclear",
  "reasoning": "Brief explanation of why you're refusing (max ${explanationLength} words)"
}

Your response must be valid JSON only.`;
}
