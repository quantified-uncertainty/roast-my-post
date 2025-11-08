import { PluginType } from "../types";
import { createPluginBasedAgent } from "../utils/createPluginBasedAgent";

export const comprehensiveCheckerAgent = createPluginBasedAgent({
  id: "system-fallacy-verification",
  name: "Comprehensive Check",
  description: "Combines Fact Check, Math Check, and Forecast Check",
  pluginIds: [PluginType.FACT_CHECK, PluginType.MATH, PluginType.FORECAST],
  readmeId: "comprehensive-checker",
  isLlmCostTracked: true,
});
