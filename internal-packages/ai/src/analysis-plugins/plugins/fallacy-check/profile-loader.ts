/**
 * Profile Loader for Fallacy Checker
 *
 * Loads, validates, and manages profile configurations from the database.
 * Provides methods to load profiles by ID or get the default profile for an agent.
 */

import { prisma } from '@roast/db';
import { logger } from '../../../shared/logger';
import { REASONING_EFFORT_VALUES } from '../../../types/common';
import type {
  FallacyCheckerProfile,
  FallacyCheckerProfileConfig,
  ModelConfig,
  ThresholdConfig,
  FilterChainConfig,
  FilterChainItem,
  PromptConfig,
  FilterType,
  ReasoningConfig,
} from './profile-types';
import {
  createDefaultProfileConfig,
  DEFAULT_EXTRACTOR_MODEL,
  DEFAULT_JUDGE_MODEL,
  migrateFilterChainConfig,
} from './profile-types';

// ============================================================================
// Profile Loading
// ============================================================================

/**
 * Load a profile by ID
 *
 * @throws Error if profile not found
 */
export async function loadProfile(profileId: string): Promise<FallacyCheckerProfileConfig> {
  const profile = await prisma.fallacyCheckerProfile.findUnique({
    where: { id: profileId },
  });

  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  return validateAndMergeConfig(profile.config);
}

/**
 * Load the default profile for an agent
 *
 * Returns the profile marked as default, or creates a default config if none exists.
 */
export async function loadDefaultProfile(agentId: string): Promise<FallacyCheckerProfileConfig> {
  const profile = await prisma.fallacyCheckerProfile.findFirst({
    where: {
      agentId,
      isDefault: true,
    },
  });

  if (!profile) {
    // No default profile found, return default config
    return createDefaultProfileConfig();
  }

  return validateAndMergeConfig(profile.config);
}

/**
 * Load a profile by ID or fall back to default for agent
 */
export async function loadProfileOrDefault(
  profileId: string | undefined,
  agentId: string
): Promise<FallacyCheckerProfileConfig> {
  if (profileId) {
    try {
      return await loadProfile(profileId);
    } catch (error) {
      // Log warning and fall back to default
      logger.warn(`Failed to load profile ${profileId}, using default:`, error);
    }
  }
  return loadDefaultProfile(agentId);
}

/**
 * Get all profiles for an agent
 */
export async function getProfilesForAgent(agentId: string): Promise<FallacyCheckerProfile[]> {
  const profiles = await prisma.fallacyCheckerProfile.findMany({
    where: { agentId },
    orderBy: [
      { isDefault: 'desc' },
      { name: 'asc' },
    ],
  });

  return profiles.map((p) => ({
    ...p,
    config: validateAndMergeConfig(p.config),
  }));
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate and merge a raw config with defaults
 *
 * Handles missing fields and invalid values by falling back to defaults.
 */
export function validateAndMergeConfig(rawConfig: unknown): FallacyCheckerProfileConfig {
  const defaults = createDefaultProfileConfig();

  if (!rawConfig || typeof rawConfig !== 'object') {
    return defaults;
  }

  const config = rawConfig as Record<string, unknown>;

  return {
    version: 1,
    models: validateModels(config.models, defaults.models),
    thresholds: validateThresholds(config.thresholds, defaults.thresholds),
    prompts: validatePrompts(config.prompts),
    filterChain: validateFilterChain(config.filterChain, defaults.filterChain),
  };
}

/**
 * Validate model configuration
 */
function validateModels(raw: unknown, defaults: ModelConfig): ModelConfig {
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const models = raw as Record<string, unknown>;

  // Validate extractors
  let extractors = defaults.extractors;
  if (Array.isArray(models.extractors) && models.extractors.length > 0) {
    extractors = models.extractors
      .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
      .map((e) => ({
        model: typeof e.model === 'string' ? e.model : DEFAULT_EXTRACTOR_MODEL,
        temperature: typeof e.temperature === 'number' || e.temperature === 'default'
          ? e.temperature
          : undefined,
        label: typeof e.label === 'string' ? e.label : undefined,
        thinking: typeof e.thinking === 'boolean' ? e.thinking : undefined,
        reasoning: validateReasoning(e.reasoning),
        provider: validateProvider(e.provider),
      }));

    if (extractors.length === 0) {
      extractors = defaults.extractors;
    }
  }

  // Validate judge
  let judge = defaults.judge;
  if (typeof models.judge === 'object' && models.judge !== null) {
    const j = models.judge as Record<string, unknown>;
    judge = {
      model: typeof j.model === 'string' ? j.model : DEFAULT_JUDGE_MODEL,
      temperature: typeof j.temperature === 'number' || j.temperature === 'default'
        ? j.temperature
        : undefined,
      thinking: typeof j.thinking === 'boolean' ? j.thinking : undefined,
      reasoning: validateReasoning(j.reasoning),
      provider: validateProvider(j.provider),
      enabled: typeof j.enabled === 'boolean' ? j.enabled : false,
    };
  }

  return {
    extractors,
    judge,
  };
}

/**
 * Validate thresholds
 */
function validateThresholds(raw: unknown, defaults: ThresholdConfig): ThresholdConfig {
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const thresholds = raw as Record<string, unknown>;

  const validNumber = (val: unknown, min: number, max: number, defaultVal: number): number => {
    if (typeof val === 'number' && val >= min && val <= max) {
      return val;
    }
    return defaultVal;
  };

  return {
    minSeverityThreshold: validNumber(thresholds.minSeverityThreshold, 0, 100, defaults.minSeverityThreshold),
    maxIssues: validNumber(thresholds.maxIssues, 1, 100, defaults.maxIssues),
    dedupThreshold: validNumber(thresholds.dedupThreshold, 0, 1, defaults.dedupThreshold),
    maxIssuesToProcess: validNumber(thresholds.maxIssuesToProcess, 1, 100, defaults.maxIssuesToProcess),
  };
}

/**
 * Validate prompts
 */
function validatePrompts(raw: unknown): PromptConfig | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const prompts = raw as Record<string, unknown>;
  const result: PromptConfig = {};

  if (typeof prompts.extractorSystemPrompt === 'string' && prompts.extractorSystemPrompt.trim()) {
    result.extractorSystemPrompt = prompts.extractorSystemPrompt;
  }
  if (typeof prompts.extractorUserPrompt === 'string' && prompts.extractorUserPrompt.trim()) {
    result.extractorUserPrompt = prompts.extractorUserPrompt;
  }
  if (typeof prompts.judgeSystemPrompt === 'string' && prompts.judgeSystemPrompt.trim()) {
    result.judgeSystemPrompt = prompts.judgeSystemPrompt;
  }
  if (typeof prompts.reviewSystemPrompt === 'string' && prompts.reviewSystemPrompt.trim()) {
    result.reviewSystemPrompt = prompts.reviewSystemPrompt;
  }

  // Return undefined if no prompts are set
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Validate filter chain
 */
function validateFilterChain(raw: unknown, defaults: FilterChainConfig): FilterChainConfig {
  // Handle empty/invalid input
  if (!raw) {
    return defaults;
  }

  // Migrate from old format if needed
  const migrated = migrateFilterChainConfig(raw);

  const validFilterTypes: FilterType[] = [
    'dedup',
    'principle-of-charity',
    'supported-elsewhere',
    'severity',
    'confidence',
    'review',
  ];

  // Validate each filter item
  const validatedFilters: FilterChainItem[] = migrated
    .filter((f): boolean => typeof f === 'object' && f !== null)
    .filter((f) => validFilterTypes.includes((f as unknown as Record<string, unknown>).type as FilterType))
    .map((f, index) => {
      const raw = f as unknown as Record<string, unknown>;
      const type = raw.type as FilterType;
      const base = {
        id: typeof raw.id === 'string' ? raw.id : `filter-${index}`,
        type,
        enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
      };

      // Add type-specific fields
      if (type === 'principle-of-charity') {
        return {
          ...base,
          type: 'principle-of-charity' as const,
          model: typeof raw.model === 'string' ? raw.model : undefined,
          temperature: (typeof raw.temperature === 'number' || raw.temperature === 'default')
            ? (raw.temperature as number | 'default')
            : undefined,
          reasoning: validateReasoning(raw.reasoning),
          provider: validateProvider(raw.provider),
          customPrompt: typeof raw.customPrompt === 'string' ? raw.customPrompt : undefined,
        };
      }

      if (type === 'supported-elsewhere') {
        return {
          ...base,
          type: 'supported-elsewhere' as const,
          model: typeof raw.model === 'string' ? raw.model : undefined,
          temperature: (typeof raw.temperature === 'number' || raw.temperature === 'default')
            ? (raw.temperature as number | 'default')
            : undefined,
          reasoning: validateReasoning(raw.reasoning),
          provider: validateProvider(raw.provider),
          customPrompt: typeof raw.customPrompt === 'string' ? raw.customPrompt : undefined,
        };
      }

      if (type === 'severity') {
        return {
          ...base,
          type: 'severity' as const,
          minSeverity: typeof raw.minSeverity === 'number' ? raw.minSeverity : 50,
        };
      }

      if (type === 'confidence') {
        return {
          ...base,
          type: 'confidence' as const,
          minConfidence: typeof raw.minConfidence === 'number' ? raw.minConfidence : 50,
        };
      }

      // Simple filters (dedup, review)
      return base as FilterChainItem;
    });

  if (validatedFilters.length === 0) {
    return defaults;
  }

  return validatedFilters;
}

/**
 * Validate reasoning config
 */
function validateReasoning(raw: unknown): ReasoningConfig | undefined {
  if (raw === false) return false;
  if (!raw || typeof raw !== 'object') return undefined;

  const r = raw as Record<string, unknown>;

  if (typeof r.effort === 'string' &&
      (REASONING_EFFORT_VALUES as readonly string[]).includes(r.effort)) {
    return { effort: r.effort as typeof REASONING_EFFORT_VALUES[number] };
  }

  if (typeof r.budget_tokens === 'number' && r.budget_tokens >= 1024) {
    return { budget_tokens: r.budget_tokens };
  }

  return undefined;
}

/**
 * Validate provider preferences
 */
function validateProvider(raw: unknown): { order?: string[]; allow_fallbacks?: boolean } | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const p = raw as Record<string, unknown>;
  const result: { order?: string[]; allow_fallbacks?: boolean } = {};

  if (Array.isArray(p.order) && p.order.every((item) => typeof item === 'string')) {
    result.order = p.order;
  }

  if (typeof p.allow_fallbacks === 'boolean') {
    result.allow_fallbacks = p.allow_fallbacks;
  }

  // Return undefined if no valid fields found
  if (Object.keys(result).length === 0) return undefined;

  return result;
}

// ============================================================================
// Profile Creation/Update Helpers
// ============================================================================

/**
 * Create a new profile
 */
export async function createProfile(
  agentId: string,
  name: string,
  config: Partial<FallacyCheckerProfileConfig>,
  options?: {
    description?: string;
    isDefault?: boolean;
  }
): Promise<FallacyCheckerProfile> {
  const fullConfig = validateAndMergeConfig(config);

  // If setting as default, unset other defaults first
  if (options?.isDefault) {
    await prisma.fallacyCheckerProfile.updateMany({
      where: { agentId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const profile = await prisma.fallacyCheckerProfile.create({
    data: {
      agentId,
      name,
      description: options?.description ?? null,
      config: fullConfig as unknown as Record<string, unknown>,
      isDefault: options?.isDefault ?? false,
    },
  });

  return {
    ...profile,
    config: fullConfig,
  };
}

/**
 * Update a profile
 */
export async function updateProfile(
  profileId: string,
  updates: {
    name?: string;
    description?: string | null;
    config?: Partial<FallacyCheckerProfileConfig>;
    isDefault?: boolean;
  }
): Promise<FallacyCheckerProfile> {
  const existing = await prisma.fallacyCheckerProfile.findUnique({
    where: { id: profileId },
  });

  if (!existing) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  // Merge config if provided
  const existingConfig = existing.config as Record<string, unknown> | null;
  const newConfig = updates.config
    ? validateAndMergeConfig({
        ...(existingConfig ?? {}),
        ...updates.config,
      })
    : validateAndMergeConfig(existingConfig);

  // If setting as default, unset other defaults first
  if (updates.isDefault) {
    await prisma.fallacyCheckerProfile.updateMany({
      where: { agentId: existing.agentId, isDefault: true, id: { not: profileId } },
      data: { isDefault: false },
    });
  }

  const profile = await prisma.fallacyCheckerProfile.update({
    where: { id: profileId },
    data: {
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.config !== undefined && { config: newConfig as unknown as Record<string, unknown> }),
      ...(updates.isDefault !== undefined && { isDefault: updates.isDefault }),
    },
  });

  return {
    ...profile,
    config: newConfig,
  };
}

/**
 * Delete a profile
 */
export async function deleteProfile(profileId: string): Promise<void> {
  await prisma.fallacyCheckerProfile.delete({
    where: { id: profileId },
  });
}

// ============================================================================
// Export Types
// ============================================================================

export type { FallacyCheckerProfile, FallacyCheckerProfileConfig };
