import { z } from "zod";

// Schema for form validation
export const agentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  purpose: z.enum(["ASSESSOR", "ADVISOR", "ENRICHER", "EXPLAINER"]),
  description: z.string().min(50, "Description must be at least 50 characters"),
  iconName: z.string().min(1, "Icon name is required"),
  capabilities: z.string().min(1, "At least one capability is required"),
  use_cases: z.string().min(1, "At least one use case is required"),
  limitations: z.string().min(1, "At least one limitation is required"),
  genericInstructions: z
    .string()
    .min(50, "Generic instructions must be at least 50 characters"),
  summaryInstructions: z
    .string()
    .min(50, "Summary instructions must be at least 50 characters"),
  commentInstructions: z
    .string()
    .min(50, "Comment instructions must be at least 50 characters"),
  gradeInstructions: z.string().optional(),
});

export type AgentInput = z.infer<typeof agentSchema>;
