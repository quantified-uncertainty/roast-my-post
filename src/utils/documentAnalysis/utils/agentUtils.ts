import { evaluationAgents } from "../../../data/agents";
import { EvaluationAgent } from "../../../types/evaluationAgents";

export function loadAgentInfo(agentId: string): EvaluationAgent {
  const agentInfo = evaluationAgents.find((agent) => agent.id === agentId);
  if (!agentInfo) {
    throw new Error(`Agent info not found for ID: ${agentId}`);
  }
  return agentInfo;
}
