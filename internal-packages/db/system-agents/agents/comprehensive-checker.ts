import { PluginType } from "../types";
import { createPluginBasedAgent } from "../utils/createPluginBasedAgent";

export const comprehensiveCheckerAgent = createPluginBasedAgent({
  id: "system-epistemic-verification",
  name: "Comprehensive Checker",
  description: "Combines Fact Checker, Math Checker, and Forecast Checker",
  pluginIds: [PluginType.FACT_CHECK, PluginType.MATH, PluginType.FORECAST],
  readmeId: "comprehensive-checker",
});
