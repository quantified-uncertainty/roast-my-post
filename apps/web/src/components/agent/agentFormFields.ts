import { type AgentInput } from "@roast/ai";

export interface FormFieldConfig {
  name: keyof AgentInput;
  label: string;
  required?: boolean;
  type: "text" | "textarea" | "select" | "checkbox";
  placeholder?: string;
  options?: { value: string; label: string }[];
  description?: string;
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
    name: "description",
    label: "Description",
    required: true,
    type: "textarea",
    placeholder: "Describe what this agent does",
  },
  {
    name: "primaryInstructions",
    label: "Analysis Instructions",
    required: true,
    type: "textarea",
    placeholder: "Instructions for analysis, including summary generation, comment creation, and grading criteria if applicable",
  },
  {
    name: "selfCritiqueInstructions",
    label: "Self-Critique Instructions",
    type: "textarea",
    placeholder: "Instructions for scoring evaluation quality 1-100 (e.g., 'Score based on: Technical accuracy (40%), Completeness (30%), Actionability (30%)')",
  },
  {
    name: "providesGrades",
    label: "Provides Grades",
    type: "checkbox",
    description: "Check if this agent should provide grades (0-100) for documents",
  },
  {
    name: "extendedCapabilityId",
    label: "Extended Capability ID",
    type: "text",
    placeholder: "ID for special agent capabilities (optional)",
  },
  {
    name: "readme",
    label: "README",
    type: "textarea",
    placeholder: "Human-readable documentation for users and future modifiers (optional)",
  },
];
