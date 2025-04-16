export type AgentPurpose = "assessor" | "advisor" | "enricher" | "explainer";
/*
Assessor:
- Evaluates the quality of the document
- Provides a score of the document

Advisor:
- Provides advice on how to improve the document

Enricher:
- Enriches the document with additional information
- Can bring in external sources, recommend further reading, generate diagrams, etc.

Explainer:
- Explains the document to a non-expert
- Provides a summary of the document
*/

export interface EvaluationAgent {
  id: string;
  name: string;
  purpose: AgentPurpose;
  version: string;
  description: string;
  iconName: string;
  capabilities: string[];
  use_cases: string[];
  limitations: string[];
  genericInstructions: string;
  summaryInstructions: string;
  commentInstructions: string;
  gradeInstructions?: string;
}
