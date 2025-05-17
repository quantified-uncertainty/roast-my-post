import { z } from "zod";

// Enum for agent purposes
export const AgentPurposeEnum = z.enum([
  "ASSESSOR",
  "ADVISOR",
  "ENRICHER",
  "EXPLAINER",
]);

export type AgentPurpose = z.infer<typeof AgentPurposeEnum>;

// Schema for agent owner
export const AgentOwnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export type AgentOwner = z.infer<typeof AgentOwnerSchema>;

// Schema for agent version
export const AgentVersionSchema = z.object({
  id: z.string(),
  version: z.number(),
  name: z.string(),
  agentType: AgentPurposeEnum,
  description: z.string(),
  genericInstructions: z.string(),
  summaryInstructions: z.string(),
  commentInstructions: z.string(),
  gradeInstructions: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type AgentVersion = z.infer<typeof AgentVersionSchema>;

// Base schema for common agent fields
const BaseAgentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  purpose: AgentPurposeEnum,
  description: z.string().min(30, "Description must be at least 30 characters"),
  iconName: z.string().min(1, "Icon name is required"),
  genericInstructions: z
    .string()
    .min(30, "Generic instructions must be at least 30 characters"),
  summaryInstructions: z
    .string()
    .min(30, "Summary instructions must be at least 30 characters"),
  commentInstructions: z
    .string()
    .min(30, "Comment instructions must be at least 30 characters"),
  gradeInstructions: z.string().optional(),
});

// Schema for the complete agent
export const AgentSchema = BaseAgentSchema.extend({
  id: z.string(),
  version: z.string(),
  owner: AgentOwnerSchema.optional(),
  isOwner: z.boolean().optional(),
});

export type Agent = z.infer<typeof AgentSchema>;

// Schema for agent input (used in forms)
export const AgentInputSchema = BaseAgentSchema.extend({
  agentId: z.string().optional(),
});

export type AgentInput = z.infer<typeof AgentInputSchema>;

// Schema for agent creation/update response
export const AgentResponseSchema = z.object({
  success: z.boolean(),
  agent: AgentSchema.optional(),
  id: z.string().optional(),
  error: z.string().optional(),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;
