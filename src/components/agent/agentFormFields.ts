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
    name: "iconName",
    label: "Icon Name",
    required: true,
    type: "text",
    placeholder: "Icon name (e.g., StarIcon)",
  },
  {
    name: "genericInstructions",
    label: "Generic Instructions",
    required: true,
    type: "textarea",
    placeholder: "Instructions for general agent behavior",
  },
  {
    name: "summaryInstructions",
    label: "Summary Instructions",
    required: true,
    type: "textarea",
    placeholder: "Instructions for generating summary",
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
    required: true,
    type: "textarea",
    placeholder: "Instructions for generating comments",
  },
  {
    name: "gradeInstructions",
    label: "Grade Instructions",
    type: "textarea",
    placeholder: "Instructions for grading (optional)",
  },
];
