import { SystemAgentDefinition, PluginType } from "../types";

export const agenticAgent: SystemAgentDefinition = {
  id: "system-agentic",
  name: "Agentic Analysis",
  description:
    "Multi-agent orchestrated document analysis using fact-checker, fallacy-checker, and reviewer sub-agents",
  providesGrades: true,
  pluginIds: [PluginType.AGENTIC],
  extendedCapabilityId: "agentic",
  isRecommended: false,
  isLlmCostTracked: true,
};
