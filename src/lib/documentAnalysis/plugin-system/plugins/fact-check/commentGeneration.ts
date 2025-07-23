import type { Comment } from '@/types/documentSchema';
import type { VerifiedFact } from './index';

export function generateFactCheckComments(
  fact: VerifiedFact,
  location: { startOffset: number; endOffset: number }
): Comment {
  const content = generateCommentContent(fact);
  
  const comment: Comment = {
    description: content,
    highlight: {
      startOffset: location.startOffset,
      endOffset: location.endOffset,
      quotedText: fact.originalText,
      isValid: true
    },
    isValid: true,
    title: getCommentTitle(fact),
    observation: getObservation(fact),
    significance: getSignificance(fact),
    importance: getImportanceScore(fact)
  };

  // Add grade for verified false claims
  if (fact.verification?.verdict === 'false') {
    comment.grade = 0.2; // Low grade for false claims
  } else if (fact.verification?.verdict === 'true' && fact.verification.confidence === 'high') {
    comment.grade = 0.9; // High grade for verified true claims
  }

  return comment;
}

function getCommentTitle(fact: VerifiedFact): string {
  if (fact.verification) {
    switch (fact.verification.verdict) {
      case 'true':
        return `✓ Verified: ${fact.topic}`;
      case 'false':
        return `✗ False Claim: ${fact.topic}`;
      case 'partially-true':
        return `⚠️ Partially True: ${fact.topic}`;
      case 'unverifiable':
        return `? Unverifiable: ${fact.topic}`;
      case 'outdated':
        return `⏰ Outdated: ${fact.topic}`;
    }
  }
  
  // Unverified claims - show estimated truth probability
  if (fact.claim.truthProbability <= 30) {
    return `🚨 Likely False: ${fact.topic}`;
  }
  if (fact.claim.truthProbability <= 50) {
    return `⚠️ Questionable: ${fact.topic}`;
  }
  if (fact.claim.importanceScore >= 80) {
    return `📌 Key Claim: ${fact.topic}`;
  }
  return `📊 Factual Claim: ${fact.topic}`;
}

function getObservation(fact: VerifiedFact): string | undefined {
  if (fact.verification) {
    return fact.verification.explanation;
  }
  
  // For unverified claims, show truth probability estimate
  if (!fact.verification && fact.claim.truthProbability <= 70) {
    return `Estimated ${fact.claim.truthProbability}% probability of being true based on initial assessment.`;
  }
  
  return undefined;
}

function getSignificance(fact: VerifiedFact): string | undefined {
  if (fact.verification) {
    if (fact.verification.verdict === 'false') {
      return fact.verification.corrections || 'This claim appears to be inaccurate and should be corrected.';
    }
    if (fact.verification.verdict === 'partially-true') {
      return 'This claim contains some truth but important details are incorrect or missing.';
    }
    if (fact.verification.verdict === 'outdated') {
      return 'This information was accurate in the past but is no longer current.';
    }
  }
  
  // For unverified but important claims
  if (fact.claim.importanceScore >= 80 && !fact.verification) {
    return 'This is a key claim that would benefit from verification or citation.';
  }
  if (fact.claim.truthProbability <= 30 && !fact.verification) {
    return 'This claim appears questionable and should be carefully reviewed.';
  }
  
  return undefined;
}

function getImportanceScore(fact: VerifiedFact): number {
  // Base importance from claim scores
  let importance = fact.claim.importanceScore / 100;
  
  // Boost importance for verified false claims
  if (fact.verification?.verdict === 'false') {
    importance = Math.min(1, importance + 0.3);
  }
  // Boost for partially true claims that need clarification
  else if (fact.verification?.verdict === 'partially-true') {
    importance = Math.min(1, importance + 0.2);
  }
  // Boost for likely false unverified claims
  else if (!fact.verification && fact.claim.truthProbability <= 40) {
    importance = Math.min(1, importance + 0.2);
  }
  
  return importance;
}

function generateCommentContent(fact: VerifiedFact): string {
  const parts: string[] = [];
  
  // Scores summary
  parts.push(`**Scores**: Importance ${fact.claim.importanceScore}/100, Checkability ${fact.claim.checkabilityScore}/100`);
  
  if (!fact.verification) {
    parts.push(`\n**Truth Probability**: ${fact.claim.truthProbability}% (estimated)`);
  }
  
  // Verification details
  if (fact.verification) {
    parts.push(`\n\n**Verdict**: ${formatVerdict(fact.verification.verdict)} (${fact.verification.confidence} confidence)`);
    
    if (fact.verification.evidence.length > 0) {
      parts.push(`\n\n**Evidence**:`);
      fact.verification.evidence.forEach(e => parts.push(`\n- ${e}`));
    }
    
    if (fact.verification.lastVerified) {
      parts.push(`\n\n*Last verified: ${fact.verification.lastVerified}*`);
    }
  } else if (fact.shouldVerify()) {
    parts.push(`\n\n*This claim has high priority for verification but was not checked due to resource limits.*`);
  }
  
  // Additional context section removed - fields not in simplified schema
  
  return parts.join('');
}

function formatVerdict(verdict: string): string {
  switch (verdict) {
    case 'true': return '✓ True';
    case 'false': return '✗ False';
    case 'partially-true': return '⚠️ Partially True';
    case 'unverifiable': return '? Unverifiable';
    case 'outdated': return '⏰ Outdated';
    default: return verdict;
  }
}