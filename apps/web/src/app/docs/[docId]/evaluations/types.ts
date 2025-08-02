import type { Evaluation } from "@/types/databaseTypes";

export interface AgentWithEvaluation {
  id: string;
  name: string;
  version: string;
  description: string;
  evaluation?: Evaluation;
  isIntended: boolean;
}
