import { PluginType } from "../types";
import { createPluginBasedAgent } from "../utils/createPluginBasedAgent";

export const linkCheckerAgent = createPluginBasedAgent({
  id: "system-link-verifier",
  name: "Link Checker",
  description: "Validates external links in documents, checking for broken URLs, redirects, and accessibility issues",
  pluginIds: [PluginType.LINK_ANALYSIS],
  readmeId: "link-checker",
  isRecommended: true,
  isLlmCostTracked: false
});
