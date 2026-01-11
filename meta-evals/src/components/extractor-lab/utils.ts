/**
 * Utility functions for Extractor Lab
 */

import {
  getMultiExtractorConfig,
  type ExtractorConfig,
} from "@roast/ai/fallacy-extraction/lab";
import type { SimpleLogger, ExtractorIssue, PreJudgeDedupResult, MultiExtractorResult } from "./types";

/** Temperature presets for cycling */
export const TEMP_PRESETS = ["default", 0, 0.3, 0.5, 0.7, 1.0] as const;

/** Truncate string to fit terminal width */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

/** Simple logger for the judge tool */
export const simpleLogger: SimpleLogger = {
  info: (...args: unknown[]) => console.error("[INFO]", ...args),
  warn: (...args: unknown[]) => console.error("[WARN]", ...args),
  error: (...args: unknown[]) => console.error("[ERROR]", ...args),
  debug: (..._args: unknown[]) => {},
};

/** Load extractor configs from FALLACY_EXTRACTORS env var, fallback to default */
export function getInitialExtractorConfigs(): ExtractorConfig[] {
  try {
    const config = getMultiExtractorConfig();
    return config.extractors;
  } catch {
    return [{ model: "claude-sonnet-4-5-20250929", temperature: "default", thinking: false }];
  }
}

/** Generate a label for an extractor config */
export function generateExtractorLabel(config: ExtractorConfig): string {
  const modelShort = config.model.split("/").pop()?.replace(/-\d{8}$/, "") ?? config.model;
  const tempStr = config.temperature === "default" ? "tDef" : `t${config.temperature}`;
  const thinkStr = config.thinking ? "think" : "noThink";
  return `${modelShort}-${tempStr}-${thinkStr}`;
}

/** Run pre-judge deduplication on extractor results */
export function runPreJudgeDedup(extractionResult: MultiExtractorResult): PreJudgeDedupResult {
  // Flatten all issues from all extractors
  const allIssues: ExtractorIssue[] = extractionResult.extractorResults.flatMap((r) =>
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

  // Remove exact text duplicates (case-insensitive, whitespace normalized)
  const seen = new Set<string>();
  const unique: ExtractorIssue[] = [];
  const duplicates: ExtractorIssue[] = [];

  for (const issue of allIssues) {
    const key = issue.exactText.toLowerCase().replace(/\s+/g, " ").trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(issue);
    } else {
      duplicates.push(issue);
    }
  }

  return {
    unique,
    duplicates,
    originalCount: allIssues.length,
  };
}

/** Calculate text widths based on terminal width */
export function calculateTextWidths(termWidth: number) {
  // For extraction results: "  🔴 [issueType] text"
  // Overhead: indicator(2) + spaces(2) + emoji(2) + space(1) + [type](~18) + space(1) = ~26
  const issueTextWidth = Math.max(40, termWidth - 6 - 26);

  // For judge decisions: "[+] type.padEnd(18) text [A,B]"
  // Overhead: indicator(2) + [+]space(4) + type(18) + space(1) + space(1) + [A,B](10) = 36
  const judgeTextWidth = Math.max(40, termWidth - 6 - 36);

  return { issueTextWidth, judgeTextWidth };
}
