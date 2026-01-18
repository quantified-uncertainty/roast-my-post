/**
 * Fuzzy deduplication strategies for comparing extraction issues.
 *
 * Four strategies:
 * 1. Exact - Normalized exact match
 * 2. Jaccard - Word overlap similarity
 * 3. Fuse.js - Fuzzy search with Bitap algorithm
 * 4. uFuzzy - Lightweight fuzzy search
 */

import Fuse from "fuse.js";
import uFuzzy from "@leeoniya/ufuzzy";
import type {
  ExtractorIssue,
  DedupStrategy,
  DedupComparison,
  DuplicateMatch,
  MultiStrategyDedupResult,
} from "./types";

// ============================================================================
// Normalization
// ============================================================================

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function getWords(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

// ============================================================================
// Similarity Functions
// ============================================================================

/**
 * Jaccard similarity: intersection over union of words
 */
export function jaccardSimilarity(a: string, b: string): number {
  const wordsA = getWords(a);
  const wordsB = getWords(b);

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;

  return intersection / union;
}

/**
 * Check if one text contains the other (after normalization)
 */
export function isSubstring(a: string, b: string): boolean {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  return normA.includes(normB) || normB.includes(normA);
}

/**
 * Fuse.js similarity score (0 = perfect match, 1 = no match)
 */
export function fuseSimilarity(a: string, b: string): number {
  const fuse = new Fuse([{ text: b }], {
    keys: ["text"],
    includeScore: true,
    threshold: 1.0, // Accept all results, we'll check score ourselves
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  const results = fuse.search(a);
  if (results.length > 0 && results[0].score !== undefined) {
    return results[0].score;
  }
  return 1;
}

/**
 * uFuzzy similarity (returns 0-1, higher = more similar)
 */
export function ufuzzySimilarity(a: string, b: string): number {
  const uf = new uFuzzy({
    intraMode: 1,
    intraIns: 1,
    intraSub: 1,
    intraTrn: 1,
    intraDel: 1,
  });

  const haystack = [b];
  const [idxs, info] = uf.search(haystack, a);

  if (idxs && idxs.length > 0 && info && info.ranges[0]) {
    const ranges = info.ranges[0];
    let matchedChars = 0;
    for (let i = 0; i < ranges.length; i += 2) {
      matchedChars += ranges[i + 1] - ranges[i];
    }
    return matchedChars / Math.max(a.length, b.length);
  }

  return 0;
}

// ============================================================================
// Deduplication Strategies
// ============================================================================

/**
 * Calculate similarity between two issues using the specified strategy.
 * Returns { isDuplicate, similarity } where similarity is 0-1 (higher = more similar)
 */
export function calculateSimilarity(
  a: ExtractorIssue,
  b: ExtractorIssue,
  strategy: DedupStrategy,
  threshold = 0.5
): { isDuplicate: boolean; similarity: number } {
  const textA = a.exactText;
  const textB = b.exactText;

  switch (strategy) {
    case "exact": {
      const isMatch = normalizeText(textA) === normalizeText(textB);
      return { isDuplicate: isMatch, similarity: isMatch ? 1 : 0 };
    }

    case "jaccard": {
      // Check substring first
      if (isSubstring(textA, textB)) {
        return { isDuplicate: true, similarity: 1 };
      }
      const sim = jaccardSimilarity(textA, textB);
      return { isDuplicate: sim >= threshold, similarity: sim };
    }

    case "fuse": {
      // Check substring first
      if (isSubstring(textA, textB)) {
        return { isDuplicate: true, similarity: 1 };
      }
      // Fuse score: 0 = perfect, 1 = no match. Convert to 0-1 similarity.
      const fuseScore = fuseSimilarity(textA, textB);
      const sim = 1 - fuseScore;
      return { isDuplicate: fuseScore < 0.4, similarity: sim };
    }

    case "ufuzzy": {
      // Check substring first
      if (isSubstring(textA, textB)) {
        return { isDuplicate: true, similarity: 1 };
      }
      const sim = ufuzzySimilarity(textA, textB);
      return { isDuplicate: sim > threshold, similarity: sim };
    }

    default:
      return { isDuplicate: false, similarity: 0 };
  }
}

/**
 * Compute a quality score for an issue.
 * Higher = better quality (prefer to keep).
 * Factors: text length (more context), severity, confidence, importance.
 */
function computeIssueQuality(issue: ExtractorIssue): number {
  // Normalize text length (log scale to prevent extremely long texts from dominating)
  const lengthScore = Math.log10(issue.exactText.length + 1) / 4; // ~0.5-1.0 for typical lengths

  // Combine severity, confidence, importance (each 0-100, normalize to 0-1)
  const severityNorm = issue.severityScore / 100;
  const confidenceNorm = issue.confidenceScore / 100;
  const importanceNorm = issue.importanceScore / 100;

  // Weighted combination: prefer longer text, then higher scores
  // Length is most important (40%), then confidence (25%), severity (20%), importance (15%)
  return (
    lengthScore * 0.4 +
    confidenceNorm * 0.25 +
    severityNorm * 0.2 +
    importanceNorm * 0.15
  );
}

/**
 * Deduplicate issues using a specific strategy.
 * Returns unique issues and duplicate matches with similarity info.
 *
 * When duplicates are found, KEEPS the issue with higher quality score
 * (longer text + higher severity/confidence/importance).
 */
export function deduplicateWithStrategy(
  issues: ExtractorIssue[],
  strategy: DedupStrategy
): DedupComparison {
  const unique: ExtractorIssue[] = [];
  const duplicates: DuplicateMatch[] = [];

  for (const issue of issues) {
    // Check if this issue is a duplicate of any already-kept issue
    let bestMatch: { keptIdx: number; kept: ExtractorIssue; similarity: number } | null = null;

    for (let i = 0; i < unique.length; i++) {
      const kept = unique[i];
      const { isDuplicate, similarity } = calculateSimilarity(issue, kept, strategy);
      if (isDuplicate) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { keptIdx: i, kept, similarity };
        }
      }
    }

    if (bestMatch) {
      // Found a duplicate - decide which to keep based on quality score
      const newQuality = computeIssueQuality(issue);
      const keptQuality = computeIssueQuality(bestMatch.kept);

      if (newQuality > keptQuality) {
        // New issue is better - swap: remove kept, add new, mark kept as duplicate
        duplicates.push({
          duplicate: bestMatch.kept,
          matchedTo: issue,
          similarity: bestMatch.similarity,
        });
        unique[bestMatch.keptIdx] = issue;
      } else {
        // Kept issue is better - mark new as duplicate
        duplicates.push({
          duplicate: issue,
          matchedTo: bestMatch.kept,
          similarity: bestMatch.similarity,
        });
      }
    } else {
      unique.push(issue);
    }
  }

  return {
    strategy,
    unique,
    duplicates,
    originalCount: issues.length,
  };
}

/**
 * Run all dedup strategies and return comparison results
 */
export function runAllDedupStrategies(
  issues: ExtractorIssue[]
): MultiStrategyDedupResult {
  console.error(`[DEDUP] Running dedup on ${issues.length} issues...`);

  const t0 = Date.now();
  const exact = deduplicateWithStrategy(issues, "exact");
  console.error(`[DEDUP] exact: ${Date.now() - t0}ms`);

  const t1 = Date.now();
  const jaccard = deduplicateWithStrategy(issues, "jaccard");
  console.error(`[DEDUP] jaccard: ${Date.now() - t1}ms`);

  const t2 = Date.now();
  const fuse = deduplicateWithStrategy(issues, "fuse");
  console.error(`[DEDUP] fuse: ${Date.now() - t2}ms`);

  // NOTE: uFuzzy is disabled due to performance issues (hangs on large texts)
  // const t3 = Date.now();
  // const ufuzzy = deduplicateWithStrategy(issues, "ufuzzy");
  // console.error(`[DEDUP] ufuzzy: ${Date.now() - t3}ms`);

  // Return same as jaccard for now (uFuzzy disabled)
  const ufuzzy: DedupComparison = {
    strategy: "ufuzzy",
    unique: jaccard.unique,
    duplicates: jaccard.duplicates,
    originalCount: jaccard.originalCount,
  };
  console.error(`[DEDUP] ufuzzy: DISABLED (using jaccard results)`);

  console.error(`[DEDUP] Total: ${Date.now() - t0}ms`);

  return { exact, jaccard, fuse, ufuzzy };
}

/**
 * Flatten extractor results into issues with extractor IDs
 */
export function flattenExtractorResults(
  extractorResults: Array<{
    extractorId: string;
    issues: Array<{
      exactText: string;
      issueType: string;
      fallacyType?: string;
      severityScore: number;
      confidenceScore: number;
      importanceScore: number;
      reasoning: string;
    }>;
  }>
): ExtractorIssue[] {
  return extractorResults.flatMap((r) =>
    r.issues.map((issue) => ({
      extractorId: r.extractorId,
      exactText: issue.exactText,
      issueType: issue.issueType,
      fallacyType: issue.fallacyType,
      severityScore: issue.severityScore,
      confidenceScore: issue.confidenceScore,
      importanceScore: issue.importanceScore,
      reasoning: issue.reasoning,
    }))
  );
}
