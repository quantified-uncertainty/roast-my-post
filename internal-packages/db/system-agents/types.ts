import { PluginType } from "../../ai/src/analysis-plugins/types/plugin-types";

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
}

export interface SystemAgentConfig {
  agents: SystemAgentDefinition[];
}