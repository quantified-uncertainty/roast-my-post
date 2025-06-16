import type { Evaluation } from "@/types/documentSchema";

export interface AgentWithEvaluation {
  id: string;
  name: string;
  purpose: string;
  iconName: string;
  version: string;
  description: string;
  evaluation?: Evaluation;
  isIntended: boolean;
}
