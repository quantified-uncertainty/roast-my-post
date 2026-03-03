import { SystemAgentDefinition } from "../types";

export const agenticAgent: SystemAgentDefinition = {
  id: "system-agentic",
  name: "Agentic Analysis",
  description:
    "Multi-agent orchestrated document analysis using fact-checker, fallacy-checker, and reviewer sub-agents",
  providesGrades: true,
  extendedCapabilityId: "agentic",
  isRecommended: false,
  isLlmCostTracked: true,
};
