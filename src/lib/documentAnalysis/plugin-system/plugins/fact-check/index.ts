import type { 
  AnalysisResult,
  TextChunk,
  LLMInteraction
} from '../../types';
import type { Comment } from '@/types/documentSchema';
import { findFactLocation } from './locationFinder';
import { generateFactCheckComments } from './commentGeneration';
import extractFactualClaimsTool from '@/tools/extract-factual-claims';
import type { ExtractedFactualClaim } from '@/tools/extract-factual-claims';
import factCheckerTool from '@/tools/fact-checker';
import type { FactCheckResult } from '@/tools/fact-checker';
import { logger } from '@/lib/logger';

// Domain model for fact with verification
export class VerifiedFact {
  public claim: ExtractedFactualClaim;
  private chunk: TextChunk;
  public verification?: FactCheckResult;

  constructor(claim: ExtractedFactualClaim, chunk: TextChunk) {
    this.claim = claim;
    this.chunk = chunk;
  }

  get text(): string {
    return this.claim.originalText;
  }

  get originalText(): string {
    return this.claim.originalText;
  }

  get topic(): string {
    return this.claim.topic;
  }

  get averageScore(): number {
    return (this.claim.importanceScore + this.claim.checkabilityScore) / 2;
  }

  shouldVerify(): boolean {
    // Prioritize verifying:
    // 1. Important claims with low truth probability (likely false)
    // 2. Important claims that are uncertain (50-70% truth probability)
    // 3. Very checkable claims with questionable truth
    
    const isImportant = this.claim.importanceScore >= 60;
    const isCheckable = this.claim.checkabilityScore >= 60;
    const isQuestionable = this.claim.truthProbability <= 70;
    const isLikelyFalse = this.claim.truthProbability <= 40;
    
    return (isImportant && isQuestionable) || 
           (isCheckable && isLikelyFalse) ||
           (this.claim.importanceScore >= 80); // Always check critical claims
  }

  findLocation(documentText: string): ReturnType<typeof findFactLocation> {
    return findFactLocation(documentText, this.originalText);
  }

  toComment(documentText: string): Comment | null {
    const location = this.findLocation(documentText);
    if (!location) return null;

    return generateFactCheckComments(this, location);
  }
}

export class FactCheckAnalyzerJob {
  private facts: VerifiedFact[] = [];
  private llmInteractions: LLMInteraction[] = [];

  static displayName(): string {
    return "Fact Checker";
  }

  static promptForWhenToUse(): string {
    return "Use this when the document makes specific factual claims that can be verified or when checking for accuracy of statements.";
  }

  static routingExamples(): string[] {
    return [
      "Check if the facts in this article are accurate",
      "Verify the claims made in this research",
      "Fact-check this political statement",
      "Check the accuracy of statistics in this report"
    ];
  }

  async analyze(
    documentText: string,
    textChunks: TextChunk[]
  ): Promise<AnalysisResult> {
    try {
      // Phase 1: Extract factual claims from all chunks in parallel
      const extractionPromises = textChunks.map(chunk => 
        this.extractFactsFromChunk(chunk)
      );
      
      const extractionResults = await Promise.allSettled(extractionPromises);
      
      // Collect all extracted facts
      const allFacts: VerifiedFact[] = [];
      for (const result of extractionResults) {
        if (result.status === 'fulfilled' && result.value) {
          allFacts.push(...result.value.facts);
          if (result.value.llmInteraction) {
            this.llmInteractions.push(this.convertRichToLLMInteraction(result.value.llmInteraction));
          }
        }
      }

      // Deduplicate facts by similar text
      this.facts = this.deduplicateFacts(allFacts);

      // Phase 2: Verify high-priority facts
      const factsToVerify = this.facts
        .filter(fact => fact.shouldVerify())
        .slice(0, 10); // Limit to top 10 for cost management

      if (factsToVerify.length > 0) {
        await this.verifyFacts(factsToVerify);
      }

      // Phase 3: Generate comments for all facts
      const comments: Comment[] = [];
      for (const fact of this.facts) {
        const comment = fact.toComment(documentText);
        if (comment) {
          comments.push(comment);
        }
      }

      // Sort comments by importance
      comments.sort((a, b) => (b.importance || 0) - (a.importance || 0));

      // Phase 4: Generate analysis summary
      const { summary, analysisSummary } = this.generateAnalysis();

      return {
        comments,
        summary,
        analysis: analysisSummary,
        llmInteractions: this.llmInteractions,
        cost: this.calculateCost()
      };
    } catch (error) {
      logger.error('Error in FactCheckAnalyzerJob:', error);
      throw error;
    }
  }

  private async extractFactsFromChunk(chunk: TextChunk): Promise<{
    facts: VerifiedFact[];
    llmInteraction?: any;
  }> {
    try {
      const result = await extractFactualClaimsTool.execute({
        text: chunk.text,
        minQualityThreshold: 60,
        maxClaims: 10
      }, {
        logger
      });

      const facts = result.claims.map(claim => new VerifiedFact(claim, chunk));
      
      return {
        facts,
        llmInteraction: result.llmInteraction
      };
    } catch (error) {
      logger.error('Error extracting facts from chunk:', error);
      return { facts: [] };
    }
  }

  private deduplicateFacts(facts: VerifiedFact[]): VerifiedFact[] {
    const seen = new Set<string>();
    const unique: VerifiedFact[] = [];
    
    for (const fact of facts) {
      const key = fact.text.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(fact);
      }
    }
    
    // Sort by average score
    return unique.sort((a, b) => b.averageScore - a.averageScore);
  }

  private async verifyFacts(facts: VerifiedFact[]): Promise<void> {
    // Verify facts in parallel for better performance
    const verificationPromises = facts.map(fact => this.verifySingleFact(fact));
    await Promise.allSettled(verificationPromises);
  }

  private async verifySingleFact(fact: VerifiedFact): Promise<void> {
    try {
      const result = await factCheckerTool.execute({
        claim: fact.text,
        context: `Topic: ${fact.topic}, Importance: ${fact.claim.importanceScore}/100, Initial truth estimate: ${fact.claim.truthProbability}%`,
        searchForEvidence: false
      }, {
        logger
      });

      fact.verification = result.result;
      this.llmInteractions.push(this.convertRichToLLMInteraction(result.llmInteraction));
    } catch (error) {
      logger.error('Error verifying fact:', error);
    }
  }

  private convertRichToLLMInteraction(rich: any): LLMInteraction {
    return {
      messages: [
        { role: 'user' as const, content: rich.prompt },
        { role: 'assistant' as const, content: rich.response }
      ],
      usage: {
        input_tokens: rich.tokensUsed?.prompt || 0,
        output_tokens: rich.tokensUsed?.completion || 0
      }
    };
  }

  private calculateCost(): number {
    // Estimate based on token usage
    const totalTokens = this.llmInteractions.reduce((sum, interaction) => {
      return sum + (interaction.usage.input_tokens + interaction.usage.output_tokens);
    }, 0);
    
    // Rough estimate: $0.01 per 1000 tokens
    return totalTokens * 0.00001;
  }

  private generateAnalysis(): { summary: string; analysisSummary: string } {
    const totalFacts = this.facts.length;
    const verifiedFacts = this.facts.filter(f => f.verification).length;
    const trueFacts = this.facts.filter(f => f.verification?.verdict === 'true').length;
    const falseFacts = this.facts.filter(f => f.verification?.verdict === 'false').length;
    const partiallyTrueFacts = this.facts.filter(f => f.verification?.verdict === 'partially-true').length;
    
    const highImportanceFacts = this.facts.filter(f => f.claim.importanceScore >= 70).length;
    const likelyFalseFacts = this.facts.filter(f => f.claim.truthProbability <= 40).length;
    const uncertainFacts = this.facts.filter(f => f.claim.truthProbability > 40 && f.claim.truthProbability <= 70).length;

    const summary = `Found ${totalFacts} factual claims: ${verifiedFacts} verified (${trueFacts} true, ${falseFacts} false, ${partiallyTrueFacts} partially true)`;

    const topicStats = this.facts.reduce((acc, fact) => {
      acc[fact.topic] = (acc[fact.topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const analysisSummary = `
## Fact Check Analysis

**Overview**: Extracted and analyzed ${totalFacts} factual claims from the document.

**Verification Results** (${verifiedFacts} claims verified):
- ✓ True: ${trueFacts} claims
- ✗ False: ${falseFacts} claims
- ⚠️ Partially True: ${partiallyTrueFacts} claims
- ? Unverified: ${totalFacts - verifiedFacts} claims

**Claim Characteristics**:
- High importance claims: ${highImportanceFacts}
- Likely false (≤40% truth probability): ${likelyFalseFacts}
- Uncertain (41-70% truth probability): ${uncertainFacts}
- Average quality score: ${Math.round(this.facts.reduce((sum, f) => sum + f.averageScore, 0) / totalFacts || 0)}

**Topics Covered**: ${Object.entries(topicStats)
  .sort((a, b) => b[1] - a[1])
  .map(([topic, count]) => `${topic} (${count})`)
  .join(', ')}

${falseFacts > 0 ? `\n**⚠️ Accuracy Concerns**: Found ${falseFacts} false claims that should be corrected.` : ''}
${likelyFalseFacts > 3 && verifiedFacts === 0 ? `\n**⚠️ Initial Assessment**: Multiple claims appear questionable based on truth probability estimates.` : ''}
${uncertainFacts > totalFacts / 2 ? `\n**Note**: Many claims in this document are uncertain and would benefit from citations.` : ''}
    `.trim();

    return { summary, analysisSummary };
  }
}