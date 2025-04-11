export interface EvaluationAgent {
  id: string;
  name: string;
  version: string;
  description: string;
  iconName: string;
  color: string;
  capabilities: string[];
  use_cases: string[];
  limitations: string[];
}