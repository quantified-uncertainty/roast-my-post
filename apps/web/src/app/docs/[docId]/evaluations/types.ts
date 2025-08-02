import type { Evaluation } from "@roast/ai";

export interface AgentWithEvaluation {
  id: string;
  name: string;
  version: string;
  description: string;
  evaluation?: Evaluation;
  isIntended: boolean;
}
