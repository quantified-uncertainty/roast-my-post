/**
 * Lab-specific exports for Extractor Lab
 *
 * This file provides STANDALONE types and config parsing for the Extractor Lab
 * without importing from files that have circular dependencies with the plugin system.
 *
 * The types here are intentionally duplicated to avoid the circular dependency chain:
 * extraction → fallacy-extractor → constants → (back to plugin)
 */

// ============================================================================
// Standalone Type Definitions (duplicated to avoid cycles)
// ============================================================================

/** Type of epistemic issue (duplicated from constants.ts ISSUE_TYPES) */
export type IssueType =
  | 'misinformation'
  | 'missing-context'
  | 'deceptive-wording'
  | 'logical-fallacy'
  | 'verified-accurate';

/** Specific types of fallacies */
export type FallacyType =
  | 'ad-hominem'
  | 'straw-man'
  | 'false-dilemma'
  | 'slippery-slope'
  | 'appeal-to-authority'
  | 'appeal-to-emotion'
  | 'appeal-to-nature'
  | 'hasty-generalization'
  | 'survivorship-bias'
  | 'selection-bias'
  | 'cherry-picking'
  | 'circular-reasoning'
  | 'equivocation'
  | 'non-sequitur'
  | 'other';

/** Raw epistemic issue extracted from text */
export interface ExtractedFallacyIssue {
  exactText: string;
  issueType: IssueType;
  fallacyType?: FallacyType;
  severityScore: number;
  confidenceScore: number;
  reasoning: string;
  importanceScore: number;
  approximateLineNumber?: number;
  location?: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
    strategy?: string;
    confidence?: number;
  };
  [key: string]: unknown;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ExtractorConfig {
  model: string;
  temperature?: number | 'default';
  label?: string;
  thinking?: boolean;
}

/**
 * Judge configuration
 */
export interface JudgeConfig {
  model: string;
  temperature?: number | 'default';
  thinking?: boolean;
  enabled: boolean;
}

export interface MultiExtractorConfig {
  extractors: ExtractorConfig[];
  judge: JudgeConfig;
}

// ============================================================================
// Result Types
// ============================================================================

export interface ExtractorResult {
  extractorId: string;
  config: ExtractorConfig;
  issues: ExtractedFallacyIssue[];
  durationMs: number;
  costUsd?: number;
  error?: string;
}

export interface MultiExtractorResult {
  extractorResults: ExtractorResult[];
  totalDurationMs: number;
  totalIssuesFound: number;
}

// ============================================================================
// Config Parsing (standalone implementation)
// ============================================================================

const DEFAULT_EXTRACTOR_MODEL = 'claude-sonnet-4-5-20250929';
const DEFAULT_JUDGE_MODEL = 'claude-sonnet-4-5-20250929';
const DEFAULT_CLAUDE_TEMPERATURE = 0;
const DEFAULT_OPENROUTER_TEMPERATURE = 0.1;

function isOpenRouterModel(model: string): boolean {
  return model.includes('/');
}

export function getDefaultTemperature(model: string): number {
  return isOpenRouterModel(model)
    ? DEFAULT_OPENROUTER_TEMPERATURE
    : DEFAULT_CLAUDE_TEMPERATURE;
}

export function generateExtractorLabel(config: ExtractorConfig): string {
  if (config.label) {
    return config.label;
  }

  let shortName: string;
  if (isOpenRouterModel(config.model)) {
    const parts = config.model.split('/');
    shortName = parts[parts.length - 1].replace('-preview', '').replace('-latest', '');
  } else {
    if (config.model.includes('opus')) {
      shortName = 'opus';
    } else if (config.model.includes('sonnet')) {
      shortName = 'sonnet';
    } else if (config.model.includes('haiku')) {
      shortName = 'haiku';
    } else {
      shortName = config.model.slice(0, 10);
    }
  }

  const suffixParts: string[] = [];

  if (config.temperature === 'default') {
    suffixParts.push('tDef');
  } else {
    const defaultTemp = getDefaultTemperature(config.model);
    const temp = config.temperature ?? defaultTemp;
    if (temp !== defaultTemp) {
      suffixParts.push(`t${temp}`);
    }
  }

  if (config.thinking === false) {
    suffixParts.push('noThink');
  }

  if (suffixParts.length > 0) {
    return `${shortName}-${suffixParts.join('-')}`;
  }

  return shortName;
}

export function generateExtractorId(
  config: ExtractorConfig,
  index: number,
  allConfigs: ExtractorConfig[]
): string {
  const label = generateExtractorLabel(config);
  const sameLabels = allConfigs.filter(c => generateExtractorLabel(c) === label);
  if (sameLabels.length > 1) {
    return `${label}-${index}`;
  }
  return label;
}

function parseExtractorsEnvVar(envValue: string): ExtractorConfig[] {
  try {
    const parsed = JSON.parse(envValue);

    if (!Array.isArray(parsed)) {
      console.warn(
        '[MultiExtractor] FALLACY_EXTRACTORS must be a JSON array, using defaults'
      );
      return [];
    }

    const configs: ExtractorConfig[] = [];
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) {
        continue;
      }

      if (typeof item.model !== 'string' || !item.model) {
        continue;
      }

      const config: ExtractorConfig = {
        model: item.model,
      };

      if (typeof item.temperature === 'number') {
        config.temperature = item.temperature;
      } else if (item.temperature === 'default') {
        config.temperature = 'default';
      }

      if (typeof item.label === 'string' && item.label) {
        config.label = item.label;
      }

      if (typeof item.thinking === 'boolean') {
        config.thinking = item.thinking;
      }

      configs.push(config);
    }

    return configs;
  } catch (error) {
    console.warn(
      '[MultiExtractor] Failed to parse FALLACY_EXTRACTORS:',
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

/**
 * Parse FALLACY_JUDGE env var
 */
function parseJudgeEnvVar(): JudgeConfig {
  const judgeEnv = process.env.FALLACY_JUDGE;

  if (judgeEnv) {
    try {
      const parsed = JSON.parse(judgeEnv);
      if (typeof parsed === 'object' && parsed !== null && typeof parsed.model === 'string') {
        return {
          model: parsed.model,
          temperature: typeof parsed.temperature === 'number' ? parsed.temperature :
                       parsed.temperature === 'default' ? 'default' : undefined,
          thinking: typeof parsed.thinking === 'boolean' ? parsed.thinking : undefined,
          enabled: parsed.enabled !== false,
        };
      }
    } catch (e) {
      console.warn('[Config] Failed to parse FALLACY_JUDGE:', e);
    }
  }

  // Default: disabled
  return {
    model: DEFAULT_JUDGE_MODEL,
    enabled: false,
  };
}

export function getMultiExtractorConfig(): MultiExtractorConfig {
  const extractorsEnv = process.env.FALLACY_EXTRACTORS;

  let extractors: ExtractorConfig[];

  if (extractorsEnv) {
    extractors = parseExtractorsEnvVar(extractorsEnv);
    if (extractors.length === 0) {
      extractors = [{ model: DEFAULT_EXTRACTOR_MODEL }];
    }
  } else {
    extractors = [{ model: DEFAULT_EXTRACTOR_MODEL }];
  }

  return {
    extractors,
    judge: parseJudgeEnvVar(),
  };
}

export function getConfigSummary(): string {
  const config = getMultiExtractorConfig();

  const formatTemp = (ext: ExtractorConfig): string => {
    if (ext.temperature === 'default') return 'default';
    return String(ext.temperature ?? getDefaultTemperature(ext.model));
  };

  const formatThinking = (ext: ExtractorConfig): string => {
    return ext.thinking === false ? ', think=off' : '';
  };

  if (config.extractors.length === 1) {
    const ext = config.extractors[0];
    return `Single extractor: ${ext.model} (t=${formatTemp(ext)}${formatThinking(ext)})`;
  }

  const extractorSummaries = config.extractors.map((ext, i) => {
    const label = generateExtractorLabel(ext);
    return `${i + 1}. ${label} (${ext.model}, t=${formatTemp(ext)}${formatThinking(ext)})`;
  });

  const judgeStatus = config.judge.enabled
    ? `${config.judge.model} (t=${config.judge.temperature ?? 'default'}, think=${config.judge.thinking !== false})`
    : 'disabled';

  return [
    `Multi-extractor mode: ${config.extractors.length} extractors`,
    ...extractorSummaries,
    `Judge: ${judgeStatus}`,
  ].join('\n');
}
