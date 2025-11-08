/**
 * Plugin type enum for selecting which plugins to use
 * Note: Duplicated from @roast/ai to avoid cross-package dependencies
 */
export enum PluginType {
  MATH = 'math',
  SPELLING = 'spelling',
  FACT_CHECK = 'fact-check',
  FORECAST = 'forecast',
  LINK_ANALYSIS = 'link-analysis',
  FALLACY_CHECK = 'fallacy-check',
}

export interface SystemAgentDefinition {
  id: string;
  name: string;
  description: string;
  readme?: string;
  primaryInstructions?: string;
  selfCritiqueInstructions?: string;
  providesGrades: boolean;
  pluginIds?: PluginType[];
  extendedCapabilityId?: string;
  isRecommended?: boolean;
  isLlmCostTracked?: boolean;
}

export interface SystemAgentConfig {
  agents: SystemAgentDefinition[];
}
