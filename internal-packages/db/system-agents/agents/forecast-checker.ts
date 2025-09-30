import { SystemAgentDefinition, PluginType } from "../types";
import { pluginReadmes } from "../generated-plugin-readmes";

export const forecastCheckerAgent: SystemAgentDefinition = {
  id: "system-forecast-checker",
  name: "Forecast Checker",
  description: "Makes forecasts on binary questions in the document.",
  providesGrades: false, // Plugin-based agents don't provide grades
  pluginIds: [PluginType.FORECAST],
  isRecommended: true,
  readme: pluginReadmes["forecast-checker"],
};
