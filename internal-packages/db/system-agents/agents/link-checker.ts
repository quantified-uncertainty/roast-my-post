import { SystemAgentDefinition, PluginType } from "../types";
import { pluginReadmes } from "../generated-plugin-readmes";

export const linkCheckerAgent: SystemAgentDefinition = {
  id: "system-link-verifier",
  name: "Link Checker",
  description:
    "Validates external links in documents, checking for broken URLs, redirects, and accessibility issues",
  providesGrades: false, // Plugin-based agents don't provide grades
  isRecommended: true,
  pluginIds: [PluginType.LINK_ANALYSIS],
  readme: pluginReadmes["link-checker"],
};
