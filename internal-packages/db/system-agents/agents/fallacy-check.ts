import { PluginType } from "../types";
import { createPluginBasedAgent } from "../utils/createPluginBasedAgent";

export const epistemicCriticAgent = createPluginBasedAgent({
  id: "system-epistemic-critic",
  name: "Fallacy Check",
  description: "Identifies misinformation, missing context, and deceptive wording that could mislead readers",
  pluginIds: [PluginType.EPISTEMIC_CRITIC],
  readmeId: "epistemic-critic",
  isRecommended: false, // Start as non-recommended until tested
  isLlmCostTracked: true,
  extendedCapabilityId: "epistemic-critic",
});
