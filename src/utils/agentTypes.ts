import { BookOpen, Lightbulb, Scale, Search } from "lucide-react";

import type { AgentPurpose } from "@/types/agentSchema";

export const AGENT_TYPE_INFO: Record<
  AgentPurpose,
  {
    title: string;
    individualTitle: string;
    description: string;
    icon: typeof Scale;
    color: string;
  }
> = {
  ASSESSOR: {
    title: "Assessment Agents",
    individualTitle: "Assessor",
    description:
      "Agents that evaluate and analyze content, providing structured feedback and ratings.",
    icon: Scale,
    color: "orange",
  },
  ADVISOR: {
    title: "Advisory Agents",
    individualTitle: "Advisor",
    description:
      "Agents that provide recommendations and suggestions for improvement.",
    icon: Lightbulb,
    color: "blue",
  },
  ENRICHER: {
    title: "Enrichment Agents",
    individualTitle: "Enricher",
    description:
      "Agents that add context, references, and additional information to content.",
    icon: Search,
    color: "green",
  },
  EXPLAINER: {
    title: "Explanation Agents",
    individualTitle: "Explainer",
    description:
      "Agents that explain content to non-experts and provide summaries.",
    icon: BookOpen,
    color: "gray",
  },
} as const;
