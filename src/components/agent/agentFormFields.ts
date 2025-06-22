import { type AgentInput } from "@/models/Agent";

export interface FormFieldConfig {
  name: keyof AgentInput;
  label: string;
  required?: boolean;
  type: "text" | "textarea" | "select";
  placeholder: string;
  options?: { value: string; label: string }[];
}

export const agentFormFields: FormFieldConfig[] = [
  {
    name: "name",
    label: "Name",
    required: true,
    type: "text",
    placeholder: "Agent name",
  },
  {
    name: "purpose",
    label: "Purpose",
    required: true,
    type: "select",
    placeholder: "Select agent purpose",
    options: [
      { value: "ASSESSOR", label: "Assessor" },
      { value: "ADVISOR", label: "Advisor" },
      { value: "ENRICHER", label: "Enricher" },
      { value: "EXPLAINER", label: "Explainer" },
    ],
  },
  {
    name: "description",
    label: "Description",
    required: true,
    type: "textarea",
    placeholder: "Describe what this agent does",
  },
  {
    name: "genericInstructions",
    label: "Generic Instructions",
    required: false,
    type: "textarea",
    placeholder: "Instructions for general agent behavior (optional for special agents)",
  },
  {
    name: "summaryInstructions",
    label: "Summary Instructions",
    required: false,
    type: "textarea",
    placeholder: "Instructions for generating summary (optional for special agents)",
  },
  {
    name: "analysisInstructions",
    label: "Analysis Instructions",
    type: "textarea",
    placeholder: "Instructions for performing analysis (optional)",
  },
  {
    name: "commentInstructions",
    label: "Comment Instructions",
    required: false,
    type: "textarea",
    placeholder: "Instructions for generating comments (optional for special agents)",
  },
  {
    name: "gradeInstructions",
    label: "Grade Instructions",
    type: "textarea",
    placeholder: "Instructions for grading (optional)",
  },
  {
    name: "selfCritiqueInstructions",
    label: "Self-Critique Instructions",
    type: "textarea",
    placeholder: "Instructions for scoring evaluation quality 1-100 (e.g., 'Score based on: Technical accuracy (40%), Completeness (30%), Actionability (30%)')",
  },
  {
    name: "extendedCapabilityId",
    label: "Extended Capability ID",
    type: "text",
    placeholder: "ID for special agent capabilities (optional)",
  },
];
