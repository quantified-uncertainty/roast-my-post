/**
 * Fact checking system using web search
 * Verifies claims by searching for reliable sources and evidence
 */

export interface FactCheckResult {
  claim: string;
  verdict: 'TRUE' | 'FALSE' | 'PARTIALLY_TRUE' | 'UNVERIFIABLE' | 'MISLEADING';
  confidence: number; // 0-1 scale
  evidence: {
    supporting: string[];
    contradicting: string[];
    sources: string[];
  };
  reasoning: string;
  searchQueries: string[];
}

export interface FactCheckError {
  claim: string;
  error: string;
  reasoning: string;
}

/**
 * Extract factual claims from text that can be verified
 */
export function extractVerifiableClaims(text: string): string[] {
  // Simple pattern matching for factual statements
  // In a real implementation, this would use NLP to identify claims
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  
  // Look for sentences that contain factual indicators
  const factualIndicators = [
    /\b\d{4}\b/, // years
    /\bis\s+the\s+(?:first|second|third|largest|smallest|highest|lowest)/i,
    /\bwas\s+(?:born|founded|established|created)\b/i,
    /\bhas\s+a\s+population\s+of\b/i,
    /\bis\s+located\s+in\b/i,
    /\boccurred\s+(?:in|on)\b/i,
    /\bmeasures?\s+\d+/i,
    /\bcosts?\s+\$\d+/i,
    /\btakes?\s+\d+\s+(?:minutes|hours|days)/i
  ];
  
  return sentences.filter(sentence => 
    factualIndicators.some(pattern => pattern.test(sentence))
  );
}

/**
 * Generate search queries for a given claim
 */
export function generateSearchQueries(claim: string): string[] {
  const queries: string[] = [];
  
  // Direct quote search
  queries.push(`"${claim}"`);
  
  // Extract key terms and create focused searches
  const words = claim.toLowerCase().split(/\s+/);
  
  // Remove common words
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were', 'has', 'have', 'had']);
  const keyWords = words.filter(word => !stopWords.has(word) && word.length > 2);
  
  // Create search with key terms
  if (keyWords.length >= 2) {
    queries.push(keyWords.slice(0, 4).join(' '));
  }
  
  // Add fact-checking specific queries
  queries.push(`fact check ${keyWords.slice(0, 3).join(' ')}`);
  queries.push(`verify ${keyWords.slice(0, 3).join(' ')}`);
  
  return queries.slice(0, 3); // Limit to 3 queries to avoid rate limits
}

/**
 * Assess credibility of sources
 */
export function assessSourceCredibility(url: string): number {
  const domain = url.toLowerCase();
  
  // High credibility sources
  if (domain.includes('wikipedia.org') || 
      domain.includes('britannica.com') ||
      domain.includes('reuters.com') ||
      domain.includes('bbc.com') ||
      domain.includes('npr.org') ||
      domain.includes('cnn.com') ||
      domain.includes('gov') ||
      domain.includes('edu') ||
      domain.includes('nature.com') ||
      domain.includes('science.org')) {
    return 0.9;
  }
  
  // Medium credibility
  if (domain.includes('news') || 
      domain.includes('times') ||
      domain.includes('post') ||
      domain.includes('guardian')) {
    return 0.7;
  }
  
  // Fact-checking sites
  if (domain.includes('snopes.com') ||
      domain.includes('factcheck.org') ||
      domain.includes('politifact.com')) {
    return 0.95;
  }
  
  // Social media or blogs (lower credibility)
  if (domain.includes('facebook') ||
      domain.includes('twitter') ||
      domain.includes('reddit') ||
      domain.includes('blog')) {
    return 0.3;
  }
  
  // Default medium-low credibility
  return 0.5;
}

/**
 * Determine verdict based on evidence
 */
export function determineVerdict(
  supporting: string[], 
  contradicting: string[], 
  sources: string[]
): { verdict: FactCheckResult['verdict'], confidence: number } {
  
  const supportingWeight = supporting.length;
  const contradictingWeight = contradicting.length;
  
  // Calculate source credibility weights
  const sourceCredibility = sources.reduce((sum, source) => 
    sum + assessSourceCredibility(source), 0) / sources.length;
  
  // No evidence found
  if (supportingWeight === 0 && contradictingWeight === 0) {
    return { verdict: 'UNVERIFIABLE', confidence: 0.1 };
  }
  
  // Strong support, no contradiction
  if (supportingWeight >= 2 && contradictingWeight === 0) {
    return { 
      verdict: 'TRUE', 
      confidence: Math.min(0.9, 0.6 + (supportingWeight * 0.1) + (sourceCredibility * 0.2))
    };
  }
  
  // Strong contradiction, no support
  if (contradictingWeight >= 2 && supportingWeight === 0) {
    return { 
      verdict: 'FALSE', 
      confidence: Math.min(0.9, 0.6 + (contradictingWeight * 0.1) + (sourceCredibility * 0.2))
    };
  }
  
  // Mixed evidence
  if (supportingWeight > 0 && contradictingWeight > 0) {
    if (supportingWeight > contradictingWeight) {
      return { verdict: 'PARTIALLY_TRUE', confidence: 0.6 };
    } else {
      return { verdict: 'MISLEADING', confidence: 0.6 };
    }
  }
  
  // Weak evidence
  if (supportingWeight === 1 && contradictingWeight === 0) {
    return { verdict: 'PARTIALLY_TRUE', confidence: 0.4 };
  }
  
  if (contradictingWeight === 1 && supportingWeight === 0) {
    return { verdict: 'MISLEADING', confidence: 0.4 };
  }
  
  return { verdict: 'UNVERIFIABLE', confidence: 0.2 };
}