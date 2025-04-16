import { BookOpen, Lightbulb, Scale, Search } from "lucide-react";

export const AGENT_TYPE_INFO = {
  assessor: {
    title: "Assessment Agents",
    individualTitle: "Assessor",
    description:
      "Agents that evaluate and analyze content, providing structured feedback and ratings.",
    icon: Scale,
    color: "orange",
  },
  advisor: {
    title: "Advisory Agents",
    individualTitle: "Advisor",
    description:
      "Agents that provide recommendations and suggestions for improvement.",
    icon: Lightbulb,
    color: "blue",
  },
  enricher: {
    title: "Enrichment Agents",
    individualTitle: "Enricher",
    description:
      "Agents that add context, references, and additional information to content.",
    icon: Search,
    color: "green",
  },
  explainer: {
    title: "Explanation Agents",
    individualTitle: "Explainer",
    description:
      "Agents that explain content to non-experts and provide summaries.",
    icon: BookOpen,
    color: "gray",
  },
} as const;
