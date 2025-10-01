import { PluginType } from "../types";
import { createPluginBasedAgent } from "../utils/createPluginBasedAgent";

export const factCheckerAgent = createPluginBasedAgent({
  id: "system-fact-checker",
  name: "Fact Checker",
  description: "Verifies factual claims and statements for accuracy using available knowledge",
  pluginIds: [PluginType.FACT_CHECK],
  readmeId: "fact-checker",
  isRecommended: true,
});
