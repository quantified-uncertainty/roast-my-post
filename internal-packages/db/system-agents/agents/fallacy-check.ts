import { PluginType } from "../types";
import { createPluginBasedAgent } from "../utils/createPluginBasedAgent";

export const fallacyCheckAgent = createPluginBasedAgent({
  id: "system-fallacy-check",
  name: "Fallacy Check",
  description: "Identifies misinformation, missing context, and deceptive wording that could mislead readers",
  pluginIds: [PluginType.FALLACY_CHECK],
  readmeId: "fallacy-check",
  isRecommended: true,
  isLlmCostTracked: true,
  extendedCapabilityId: "fallacy-check",
});
