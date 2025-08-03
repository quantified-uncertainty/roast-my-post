import type { Comment } from '../../../shared/types';
import type { VerifiedFact } from './index';
import type { DocumentLocation } from '../../../shared/types';
import { THRESHOLDS, FORMATTING } from './constants';
import { styleHeader, CommentSeverity, formatDiff, SEVERITY_STYLES } from '../../utils/comment-styles';

export function generateFactCheckComments(
  fact: VerifiedFact,
  location: DocumentLocation
): { description: string } | null {
  const content = generateCommentContent(fact, location);
  
  // Don't create a comment if the content is empty
  if (!content || content.trim() === '') {
    return null;
  }
  
  return {
    description: content
  };
}

function getHeaderText(fact: VerifiedFact): string {
  if (fact.verification) {
    switch (fact.verification.verdict) {
      case 'true':
        return `✓ Verified: ${fact.claim.originalText.substring(0, 50)}${fact.claim.originalText.length > 50 ? '...' : ''}`;
      case 'false':
        return `✗ False: ${fact.claim.originalText.substring(0, 50)}${fact.claim.originalText.length > 50 ? '...' : ''}`;
      case 'partially-true':
        return `⚠️ Partially True: ${fact.claim.originalText.substring(0, 40)}${fact.claim.originalText.length > 40 ? '...' : ''}`;
      default:
        return fact.claim.originalText.substring(0, 60) + (fact.claim.originalText.length > 60 ? '...' : '');
    }
  }
  return fact.claim.originalText.substring(0, 60) + (fact.claim.originalText.length > 60 ? '...' : '');
}

function getFactLevel(fact: VerifiedFact): 'error' | 'warning' | 'info' | 'success' {
  if (fact.verification) {
    switch (fact.verification.verdict) {
      case 'true':
        return 'success';
      case 'false':
        return 'error';
      case 'partially-true':
      case 'outdated':
        return 'warning';
      default:
        return 'info';
    }
  }
  
  // Unverified claims based on truth probability
  if (fact.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_LIKELY_FALSE) {
    return 'error';
  }
  if (fact.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_LOW) {
    return 'warning';
  }
  return 'info';
}

function getCommentTitle(fact: VerifiedFact): string {
  const wasResearched = fact.factCheckerOutput?.perplexityData ? ' 🔍' : '';
  
  if (fact.verification) {
    switch (fact.verification.verdict) {
      case 'true':
        return `✓ Verified${wasResearched}`;
      case 'false':
        return `✗ False Claim${wasResearched}`;
      case 'partially-true':
        return `⚠️ Partially True${wasResearched}`;
      case 'unverifiable':
        return `? Unverifiable${wasResearched}`;
      case 'outdated':
        return `⏰ Outdated${wasResearched}`;
    }
  }
  
  // Unverified claims - show estimated truth probability
  if (fact.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_LIKELY_FALSE) {
    return `🚨 Likely False`;
  }
  if (fact.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_LOW) {
    return `⚠️ Questionable`;
  }
  if (fact.claim.importanceScore >= THRESHOLDS.IMPORTANCE_HIGH) {
    return `📌 Key Claim`;
  }
  return `📊 Factual Claim`;
}

function getObservation(fact: VerifiedFact): string | undefined {
  if (fact.verification) {
    return fact.verification.explanation;
  }
  
  // For unverified claims, show truth probability estimate
  if (!fact.verification && fact.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_MEDIUM) {
    return `Estimated ${fact.claim.truthProbability}% probability of being true based on initial assessment.`;
  }
  
  return undefined;
}

function getSignificance(fact: VerifiedFact): string | undefined {
  if (fact.verification) {
    if (fact.verification.verdict === 'false') {
      return 'This claim appears to be inaccurate.';
    }
    if (fact.verification.verdict === 'partially-true') {
      return 'This claim contains some truth but important details are incorrect or missing.';
    }
    if (fact.verification.verdict === 'outdated') {
      return 'This information was accurate in the past but is no longer current.';
    }
  }
  
  // For unverified but important claims
  if (fact.claim.importanceScore >= THRESHOLDS.IMPORTANCE_HIGH && !fact.verification) {
    return 'This is a key claim that would benefit from verification or citation.';
  }
  if (fact.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_LIKELY_FALSE && !fact.verification) {
    return 'This claim appears questionable and should be carefully reviewed.';
  }
  
  return undefined;
}

function getImportanceScore(fact: VerifiedFact): number {
  // Base importance from claim scores
  let importance = fact.claim.importanceScore / FORMATTING.MAX_SCORE;
  
  // Boost importance for verified false claims
  if (fact.verification?.verdict === 'false') {
    importance = Math.min(1, importance + 0.3);
  }
  // Boost for partially true claims that need clarification
  else if (fact.verification?.verdict === 'partially-true') {
    importance = Math.min(1, importance + 0.2);
  }
  // Boost for likely false unverified claims
  else if (!fact.verification && fact.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_VERY_LOW) {
    importance = Math.min(1, importance + 0.2);
  }
  
  return importance;
}

function generateCommentContent(fact: VerifiedFact, location?: DocumentLocation): string {
  // Determine severity and emoji based on verification status
  let severity: CommentSeverity;
  let emoji: string;
  let headerContent = '';
  
  if (fact.verification) {
    switch (fact.verification.verdict) {
      case 'false':
        severity = CommentSeverity.HIGH;
        emoji = '⚠️';
        // Use conciseCorrection if available
        if (fact.verification.conciseCorrection) {
          headerContent = fact.verification.conciseCorrection;
        } 
        else {
          headerContent = 'Incorrect';
        }
        break;
      case 'partially-true':
        severity = CommentSeverity.MEDIUM;
        emoji = '📝';
        headerContent = 'Partially correct';
        break;
      case 'outdated':
        severity = CommentSeverity.MEDIUM;
        emoji = '📅';
        headerContent = 'Outdated';
        break;
      case 'true':
        severity = CommentSeverity.GOOD;
        emoji = '✅';
        headerContent = 'Verified';
        break;
      case 'unverifiable':
        severity = CommentSeverity.LOW;
        emoji = '💡';
        headerContent = 'Cannot verify';
        break;
      default:
        severity = CommentSeverity.INFO;
        emoji = '📋';
        headerContent = 'Claim';
    }
  } else {
    // Unverified claims - only create comments for problematic or important ones
    if (fact.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_LIKELY_FALSE) {
      severity = CommentSeverity.HIGH;
      emoji = '🚨';
      headerContent = 'Likely false';
    } else if (fact.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_LOW) {
      severity = CommentSeverity.MEDIUM;
      emoji = '⚠️';
      headerContent = 'Questionable';
    } else if (fact.claim.importanceScore >= THRESHOLDS.IMPORTANCE_HIGH && fact.claim.truthProbability < THRESHOLDS.TRUTH_PROBABILITY_HIGH) {
      severity = CommentSeverity.LOW;
      emoji = '📍';
      headerContent = 'Key claim';
    } else {
      // Don't create comments for unverified facts with high truth probability
      // These are just normal factual statements that don't need attention
      return '';
    }
  }
  
  const style = SEVERITY_STYLES[severity];
  const styledHeader = `${emoji} [Fact] <span style="color: ${style.color}">${headerContent}</span>`;
  
  // Build content sections
  let content = styledHeader;
  
  // Add research indicator if Perplexity was used
  if (fact.factCheckerOutput?.perplexityData) {
    content += `\n\n**🔍 Research conducted**: This claim was verified using external sources.`;
  }
  
  // Add explanation if available
  if (fact.verification?.explanation) {
    content += `  \n${fact.verification.explanation}`;
  } else if (!fact.verification && fact.claim.truthProbability <= THRESHOLDS.TRUTH_PROBABILITY_MEDIUM) {
    content += `  \nEstimated ${fact.claim.truthProbability}% probability of being true`;
  }
  
  // Add score table
  content += '\n\n';
  content += '| Metric | Score |\n';
  content += '|--------|-------|\n';
  content += `| Importance | ${fact.claim.importanceScore}/100 |\n`;
  content += `| Checkability | ${fact.claim.checkabilityScore}/100 |\n`;
  content += `| Truth Probability | ${fact.claim.truthProbability}% |\n`;
  
  // Add verification confidence if available
  if (fact.verification?.confidence) {
    const confidenceMap = { low: '⚪', medium: '🟡', high: '🟢' };
    const confidenceEmoji = confidenceMap[fact.verification.confidence] || '';
    content += `| Verification Confidence | ${confidenceEmoji} ${fact.verification.confidence} |\n`;
  }
  
  // Add sources if available
  if (fact.verification?.sources && fact.verification.sources.length > 0) {
    content += '\n\n### Sources\n\n';
    fact.verification.sources.forEach(source => {
      content += `- [${source.title}](${source.url})\n`;
    });
  }
  
  // Add Perplexity debug information if available
  if (fact.factCheckerOutput?.perplexityData) {
    content += '\n\n<details>\n<summary>Debug: Research Data</summary>\n\n';
    content += '```json\n';
    content += JSON.stringify(fact.factCheckerOutput.perplexityData, null, 2);
    content += '\n```\n\n</details>';
  }
  
  return content;
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

