import { PluginType } from "../types";
import { createPluginBasedAgent } from "../utils/createPluginBasedAgent";

export const spellingGrammarAgent = createPluginBasedAgent({
  id: 'system-spelling-grammar',
  name: 'Spell Check',
  description: 'Advanced proofreading agent that detects and corrects spelling and grammar errors with US/UK convention support',
  pluginIds: [PluginType.SPELLING],
  readmeId: "spelling-grammar",
  isRecommended: true,
  isLlmCostTracked: true,
});
