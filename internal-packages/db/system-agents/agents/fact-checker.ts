import {
  PluginType,
  SystemAgentDefinition,
} from "../types";
import { pluginReadmes } from "../generated-plugin-readmes";

export const factCheckerAgent: SystemAgentDefinition = {
  id: "system-fact-checker",
  name: "Fact Checker",
  description:
    "Verifies factual claims and statements for accuracy using available knowledge",
  providesGrades: false, // Plugin-based agents don't provide grades
  pluginIds: [PluginType.FACT_CHECK],
  isRecommended: true,
  readme: pluginReadmes["fact-checker"],
};
