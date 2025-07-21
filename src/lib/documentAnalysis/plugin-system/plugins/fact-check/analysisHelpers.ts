/**
 * Analysis helpers for Fact Check Plugin
 * Helper functions for processing fact check results
 */

import { generateFindingId } from "../../utils/findingHelpers";
import type { 
  FactExtractionResult, 
  ContradictionResult,
  VerificationResult 
} from "./types";
import type {
  GenericPotentialFinding,
  GenericInvestigatedFinding,
  GenericLocatedFinding
} from "../../utils/pluginHelpers";

/**
 * Convert fact extraction results to potential findings
 */
export function convertFactResults(
  results: FactExtractionResult[],
  chunkId: string,
  pluginName: string
): GenericPotentialFinding[] {
  return results.map(result => ({
    id: generateFindingId(),
    type: 'fact_claim',
    data: {
      text: result.text,
      topic: result.topic,
      importance: result.importance,
      specificity: result.specificity,
      context: result.context
    },
    highlightHint: {
      searchText: result.text,
      chunkId
    }
  }));
}

/**
 * Convert contradictions to investigated findings
 */
export function convertContradictions(
  contradictions: ContradictionResult[],
  chunkId: string,
  pluginName: string
): GenericInvestigatedFinding[] {
  return contradictions.map(contradiction => ({
    id: generateFindingId(),
    type: 'contradiction',
    data: {
      claim1: contradiction.claim1,
      claim2: contradiction.claim2,
      explanation: contradiction.explanation
    },
    highlightHint: {
      searchText: contradiction.claim1, // Highlight the first claim
      chunkId
    },
    severity: 'high',
    message: `Contradicting claims: "${contradiction.claim1}" vs "${contradiction.claim2}" - ${contradiction.explanation}`
  }));
}

/**
 * Investigate fact findings for verification
 */
export function investigateFactFindings(
  findings: GenericPotentialFinding[],
  verifications: VerificationResult[]
): GenericInvestigatedFinding[] {
  const verificationMap = new Map(
    verifications.map(v => [v.claim, v])
  );

  return findings.map(finding => {
    const verification = verificationMap.get(finding.data.text);
    
    if (verification && !verification.verified) {
      // False claim - high severity
      return {
        ...finding,
        severity: 'high',
        message: `False claim: "${finding.data.text}" - ${verification.explanation}`
      };
    } else if (finding.data.importance === 'high' && finding.data.specificity === 'high') {
      // Important, specific claim that's either verified or unverified
      return {
        ...finding,
        severity: 'low',
        message: verification?.verified 
          ? `Verified: "${finding.data.text}" - ${verification.explanation}`
          : `Important claim (unverified): "${finding.data.text}"`
      };
    } else {
      // Lower priority claims
      return {
        ...finding,
        severity: 'low',
        message: `Claim: "${finding.data.text}" (${finding.data.topic})`
      };
    }
  });
}

/**
 * Analyze fact checking results to generate insights
 */
export function analyzeFactFindings(
  located: GenericLocatedFinding[],
  contradictions: ContradictionResult[],
  verifications: VerificationResult[]
): {
  summary: string;
  analysisSummary: string;
  patterns: {
    topicAccuracy: Map<string, { verified: number; false: number }>;
    commonErrors: string[];
  };
} {
  // Calculate statistics
  const totalClaims = located.filter(f => f.type === 'fact_claim').length;
  const falseClaims = located.filter(f => f.type === 'fact_claim' && f.severity === 'high').length;
  const verifiedClaims = verifications.filter(v => v.verified).length;

  // Analyze by topic
  const topicAccuracy = new Map<string, { verified: number; false: number }>();
  
  located.forEach(finding => {
    if (finding.type === 'fact_claim' && finding.data.topic) {
      const topic = finding.data.topic;
      const current = topicAccuracy.get(topic) || { verified: 0, false: 0 };
      
      if (finding.severity === 'high') {
        current.false++;
      } else if (finding.message?.includes('Verified:')) {
        current.verified++;
      }
      
      topicAccuracy.set(topic, current);
    }
  });

  // Identify common error patterns
  const commonErrors: string[] = [];
  
  if (falseClaims > totalClaims * 0.3) {
    commonErrors.push('High rate of factual errors (>30%)');
  }
  
  if (contradictions.length > 0) {
    commonErrors.push(`${contradictions.length} internal contradictions found`);
  }

  // Look for topics with high error rates
  topicAccuracy.forEach((stats, topic) => {
    const errorRate = stats.false / (stats.verified + stats.false);
    if (errorRate > 0.5 && (stats.verified + stats.false) > 2) {
      commonErrors.push(`${topic} claims are frequently incorrect`);
    }
  });

  // Build summary
  const summary = `Analyzed ${totalClaims} factual claims: ${verifiedClaims} verified, ${falseClaims} false, ${contradictions.length} contradictions`;

  // Build detailed analysis
  let analysisSummary = `## Fact Check Analysis\n\n`;
  analysisSummary += `### Overview\n`;
  analysisSummary += `- Total claims analyzed: ${totalClaims}\n`;
  analysisSummary += `- Verified as accurate: ${verifiedClaims}\n`;
  analysisSummary += `- Identified as false: ${falseClaims}\n`;
  analysisSummary += `- Internal contradictions: ${contradictions.length}\n\n`;

  if (topicAccuracy.size > 0) {
    analysisSummary += `### Accuracy by Topic\n`;
    topicAccuracy.forEach((stats, topic) => {
      const total = stats.verified + stats.false;
      const accuracy = total > 0 ? (stats.verified / total * 100).toFixed(0) : 0;
      analysisSummary += `- ${topic}: ${accuracy}% accurate (${stats.verified}/${total})\n`;
    });
    analysisSummary += '\n';
  }

  if (commonErrors.length > 0) {
    analysisSummary += `### Key Issues\n`;
    commonErrors.forEach(error => {
      analysisSummary += `- ${error}\n`;
    });
  }

  return {
    summary,
    analysisSummary,
    patterns: {
      topicAccuracy,
      commonErrors
    }
  };
}

/**
 * Prioritize claims for verification based on importance and specificity
 */
export function prioritizeClaimsForVerification(
  claims: GenericPotentialFinding[],
  maxCount: number
): GenericPotentialFinding[] {
  return claims
    .filter(f => f.type === 'fact_claim')
    .sort((a, b) => {
      // Calculate priority score
      const getScore = (finding: GenericPotentialFinding) => {
        let score = 0;
        if (finding.data.importance === 'high') score += 10;
        else if (finding.data.importance === 'medium') score += 5;
        
        if (finding.data.specificity === 'high') score += 10;
        else if (finding.data.specificity === 'medium') score += 5;
        
        return score;
      };
      
      return getScore(b) - getScore(a);
    })
    .slice(0, maxCount);
}