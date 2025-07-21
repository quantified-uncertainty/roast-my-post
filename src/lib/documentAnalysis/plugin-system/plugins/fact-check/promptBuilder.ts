/**
 * Prompt builder for Fact Check Plugin
 * Generates prompts for different stages of fact checking
 */

import { TextChunk } from "../../TextChunk";

export class FactCheckPromptBuilder {
  /**
   * Build prompt for extracting factual claims from text
   */
  buildExtractionPrompt(chunk: TextChunk, documentContext?: string): string {
    const expandedContext = chunk.getExpandedContext(100);
    
    return `You are analyzing a document for factual claims that can be verified.

${documentContext ? `Document context: ${documentContext}\n` : ''}

Analyze the following text chunk and extract all factual claims. Focus on:
- Specific statistics or data points (e.g., "GDP was $21T in 2023")
- Historical facts (e.g., "The Berlin Wall fell in 1989")  
- Scientific claims (e.g., "Water boils at 100°C at sea level")
- Claims about current events or recent developments
- Statements about organizations, people, or places
- Any claim presented as objective fact

Do NOT extract:
- Opinions or subjective statements
- Predictions about the future
- Hypothetical scenarios
- General statements without specific details

Context around the chunk:
${expandedContext}

Text chunk to analyze:
${chunk.text}

Extract all factual claims, categorizing them by topic, importance to the overall argument, and specificity (how verifiable they are).`;
  }

  /**
   * Build prompt for detecting contradictions between claims
   */
  buildContradictionDetectionPrompt(claims: Array<{text: string, topic: string}>): string {
    const claimsText = claims.map((c, i) => `${i + 1}. [${c.topic}] ${c.text}`).join('\n');
    
    return `Analyze the following factual claims and identify any contradictions between them.

A contradiction occurs when:
- Two claims state opposing facts about the same thing
- Claims provide different numbers/dates for the same event
- One claim negates or undermines another
- Claims are mutually exclusive

Claims to analyze:
${claimsText}

For each contradiction found, explain clearly why the claims contradict each other.
Only report actual logical contradictions, not just different topics or perspectives.`;
  }

  /**
   * Build prompt for verifying factual claims
   */
  buildVerificationPrompt(claims: Array<{text: string, topic: string}>): string {
    const claimsText = claims.map((c, i) => `${i + 1}. [${c.topic}] ${c.text}`).join('\n');
    
    return `You are a fact checker verifying the accuracy of specific claims.

For each claim below:
1. Assess whether it is factually accurate based on your knowledge
2. Provide a clear explanation of your verification
3. Indicate your confidence level (high/medium/low)

Important guidelines:
- Only mark as "verified: true" if you are confident the claim is accurate
- If you're unsure or the claim is partially true, mark as "verified: false" and explain
- Consider the specific details - dates, numbers, names must be exactly correct
- If a claim is too vague to verify, mark as false with low confidence

Claims to verify:
${claimsText}

Provide thorough explanations that would help readers understand the verification.`;
  }

  /**
   * Build prompt for analyzing patterns in fact checking results
   */
  buildAnalysisPrompt(
    verifiedClaims: number,
    falseClaims: number,
    contradictions: number,
    topics: string[]
  ): string {
    const topicSummary = topics.length > 0 
      ? `Main topics covered: ${[...new Set(topics)].join(', ')}` 
      : '';
    
    return `Based on the fact checking analysis:
- Total verified claims: ${verifiedClaims}
- False or unverifiable claims: ${falseClaims}  
- Internal contradictions: ${contradictions}
${topicSummary}

Provide a brief analysis of:
1. The overall factual accuracy of the document
2. Any patterns in the types of errors or inaccuracies
3. The reliability of different topic areas
4. Key concerns readers should be aware of

Keep the analysis concise and actionable.`;
  }
}