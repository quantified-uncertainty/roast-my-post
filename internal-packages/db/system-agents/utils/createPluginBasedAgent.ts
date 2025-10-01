/**
 * Utility factory for creating plugin-based system agents
 * Reduces boilerplate in agent definition files
 */

import { SystemAgentDefinition, PluginType } from '../types';
import { pluginReadmes } from '../generated-plugin-readmes';

export interface PluginBasedAgentConfig {
  id: string;
  name: string;
  description: string;
  pluginIds: PluginType[];
  readmeId: keyof typeof pluginReadmes;
  isRecommended?: boolean;
  providesGrades?: boolean;
}

/**
 * Creates a plugin-based system agent definition
 * All plugin-based agents share common characteristics:
 * - They don't provide grades (plugins do)
 * - They have generated README content
 * - They use one or more plugins
 */
export function createPluginBasedAgent(
  config: PluginBasedAgentConfig
): SystemAgentDefinition {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    providesGrades: config.providesGrades ?? false,
    isRecommended: config.isRecommended ?? false,
    pluginIds: config.pluginIds,
    readme: pluginReadmes[config.readmeId],
  };
}
