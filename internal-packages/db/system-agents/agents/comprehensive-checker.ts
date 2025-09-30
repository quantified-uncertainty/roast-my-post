import { SystemAgentDefinition, PluginType } from "../types";
import { pluginReadmes } from "../generated-plugin-readmes";

export const comprehensiveCheckerAgent: SystemAgentDefinition = {
  id: "system-epistemic-verification",
  name: "Comprehensive Checker",
  description: "Combines Fact Checker, Math Checker, and Forecast Checker",
  providesGrades: false, // Plugin-based agents don't provide grades
  pluginIds: [PluginType.FACT_CHECK, PluginType.MATH, PluginType.FORECAST], // Multiple plugins
  readme: pluginReadmes["comprehensive-checker"],
};
