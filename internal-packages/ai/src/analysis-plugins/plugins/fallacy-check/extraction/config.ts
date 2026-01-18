/**
 * Multi-Extractor Configuration Parser
 *
 * Parses the FALLACY_EXTRACTORS environment variable and provides defaults.
 * Also supports profile-based configuration from the database.
 */

import type { ExtractorConfig, MultiExtractorConfig, JudgeConfig } from './types';
import type { FallacyCheckerProfileConfig } from '../profile-types';

/** Default model for extraction when not configured */
const DEFAULT_EXTRACTOR_MODEL = 'claude-sonnet-4-5-20250929';

/** Default model for judge aggregation */
const DEFAULT_JUDGE_MODEL = 'claude-sonnet-4-5-20250929';

/** Default temperature for Claude models */
const DEFAULT_CLAUDE_TEMPERATURE = 0;

/** Default temperature for OpenRouter models */
const DEFAULT_OPENROUTER_TEMPERATURE = 0.1;

/**
 * Check if a model is an OpenRouter model (contains '/')
 */
function isOpenRouterModel(model: string): boolean {
  return model.includes('/');
}

/**
 * Get default temperature for a model
 */
export function getDefaultTemperature(model: string): number {
  return isOpenRouterModel(model)
    ? DEFAULT_OPENROUTER_TEMPERATURE
    : DEFAULT_CLAUDE_TEMPERATURE;
}

/**
 * Generate a unique label for an extractor config
 */
export function generateExtractorLabel(config: ExtractorConfig): string {
  if (config.label) {
    return config.label;
  }

  // Extract short model name
  let shortName: string;
  if (isOpenRouterModel(config.model)) {
    // e.g., "google/gemini-3-flash-preview" -> "gemini-3-flash"
    const parts = config.model.split('/');
    shortName = parts[parts.length - 1].replace('-preview', '').replace('-latest', '');
  } else {
    // e.g., "claude-sonnet-4-5-20250929" -> "sonnet"
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

  // Build suffix parts
  const suffixParts: string[] = [];

  // Add temperature suffix if non-default
  if (config.temperature === 'default') {
    suffixParts.push('tDef');
  } else {
    const defaultTemp = getDefaultTemperature(config.model);
    const temp = config.temperature ?? defaultTemp;
    if (temp !== defaultTemp) {
      suffixParts.push(`t${temp}`);
    }
  }

  // Add thinking suffix if disabled
  if (config.thinking === false) {
    suffixParts.push('noThink');
  }

  if (suffixParts.length > 0) {
    return `${shortName}-${suffixParts.join('-')}`;
  }

  return shortName;
}

/**
 * Generate a unique extractor ID (for telemetry correlation)
 */
export function generateExtractorId(
  config: ExtractorConfig,
  index: number,
  allConfigs: ExtractorConfig[]
): string {
  const label = generateExtractorLabel(config);

  // Check if this label would be duplicated
  const sameLabels = allConfigs.filter(c => generateExtractorLabel(c) === label);

  // Only append index if there are duplicates
  if (sameLabels.length > 1) {
    return `${label}-${index}`;
  }
  return label;
}

/**
 * Parse and validate the FALLACY_EXTRACTORS environment variable
 *
 * Expected format:
 * ```json
 * [
 *   {"model": "claude-sonnet-4-5-20250929"},
 *   {"model": "claude-sonnet-4-5-20250929", "temperature": 0.5},
 *   {"model": "google/gemini-3-flash-preview", "temperature": 0.1}
 * ]
 * ```
 */
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
        console.warn('[MultiExtractor] Invalid extractor config, skipping:', item);
        continue;
      }

      if (typeof item.model !== 'string' || !item.model) {
        console.warn(
          '[MultiExtractor] Extractor config missing model, skipping:',
          item
        );
        continue;
      }

      const config: ExtractorConfig = {
        model: item.model,
      };

      // Temperature can be a number or "default" string
      if (typeof item.temperature === 'number') {
        config.temperature = item.temperature;
      } else if (item.temperature === 'default') {
        config.temperature = 'default';
      }

      if (typeof item.label === 'string' && item.label) {
        config.label = item.label;
      }

      // Thinking defaults to true (enabled), can be set to false
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
 *
 * Example:
 * FALLACY_JUDGE='{"model":"google/gemini-3-flash-preview","temperature":"default","thinking":false,"enabled":true}'
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

/**
 * Get the multi-extractor configuration from environment variables
 *
 * Environment variables:
 * - FALLACY_EXTRACTORS: JSON array of extractor configs
 * - FALLACY_JUDGE: JSON object with judge config (model, temperature, thinking, enabled)
 *
 * Defaults to single extractor with DEFAULT_EXTRACTOR_MODEL if not configured.
 */
export function getMultiExtractorConfig(): MultiExtractorConfig {
  const extractorsEnv = process.env.FALLACY_EXTRACTORS;

  let extractors: ExtractorConfig[];

  if (extractorsEnv) {
    extractors = parseExtractorsEnvVar(extractorsEnv);
    if (extractors.length === 0) {
      console.warn('[MultiExtractor] No valid extractors in FALLACY_EXTRACTORS, using defaults');
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

/**
 * Check if LLM judge is enabled for aggregation
 */
export function isJudgeEnabled(): boolean {
  const config = getMultiExtractorConfig();
  return config.judge.enabled;
}

/**
 * Check if multi-extractor mode is enabled (more than one extractor configured)
 */
export function isMultiExtractorEnabled(): boolean {
  const config = getMultiExtractorConfig();
  return config.extractors.length > 1;
}

/**
 * Convert a profile config to MultiExtractorConfig
 *
 * This allows using database-stored profiles instead of environment variables.
 */
export function profileToMultiExtractorConfig(
  profileConfig: FallacyCheckerProfileConfig
): MultiExtractorConfig {
  return {
    extractors: profileConfig.models.extractors,
    judge: profileConfig.models.judge,
  };
}

/**
 * Get multi-extractor configuration from a profile or fall back to environment variables
 *
 * @param profileConfig Optional profile config from database
 */
export function getMultiExtractorConfigFromProfile(
  profileConfig?: FallacyCheckerProfileConfig
): MultiExtractorConfig {
  if (profileConfig) {
    return profileToMultiExtractorConfig(profileConfig);
  }
  return getMultiExtractorConfig();
}

/**
 * Get a human-readable summary of the current configuration
 */
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
