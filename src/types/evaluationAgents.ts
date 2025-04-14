export interface EvaluationAgent {
  id: string;
  name: string;
  version: string;
  description: string;
  iconName: string;
  capabilities: string[];
  use_cases: string[];
  limitations: string[];
  genericInstructions: string;
  summaryInstructions: string;
  commentInstructions: string;
}
