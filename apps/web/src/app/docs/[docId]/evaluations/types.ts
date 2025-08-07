import type { Evaluation } from "@/shared/types/databaseTypes";

export interface AgentWithEvaluation {
  id: string;
  name: string;
  version: string;
  description: string;
  evaluation?: Evaluation;
  isIntended: boolean;
}
