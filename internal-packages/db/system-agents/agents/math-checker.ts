import { SystemAgentDefinition, PluginType } from "../types";
import { pluginReadmes } from "../generated-plugin-readmes";

export const mathCheckerAgent: SystemAgentDefinition = {
  id: "system-math-checker",
  name: "Math Checker",
  description:
    "Verifies mathematical statements, calculations, and formulas for correctness",
  providesGrades: false, // Plugin-based agents don't provide grades
  isRecommended: true,
  pluginIds: [PluginType.MATH],
  readme: pluginReadmes["math-checker"],
};
