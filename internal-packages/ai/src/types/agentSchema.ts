import { z } from "zod";

// Schema for agent owner
export const AgentOwnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
});

export type AgentOwner = z.infer<typeof AgentOwnerSchema>;

// Schema for agent version
export const AgentVersionSchema = z.object({
  id: z.string(),
  version: z.number(),
  name: z.string(),
  description: z.string(),
  primaryInstructions: z.string().optional(),
  selfCritiqueInstructions: z.string().optional(),
  providesGrades: z.boolean().default(false),
  extendedCapabilityId: z.string().optional(),
  readme: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type AgentVersion = z.infer<typeof AgentVersionSchema>;

// Base schema for common agent fields
const BaseAgentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(1, "Description is required"),
  primaryInstructions: z.string().optional(),
  selfCritiqueInstructions: z.string().optional(),
  providesGrades: z.boolean().default(false),
  extendedCapabilityId: z.string().optional(),
  readme: z.string().optional(),
});

// Schema for the complete agent
export const AgentSchema = BaseAgentSchema.extend({
  id: z.string(),
  version: z.string(),
  owner: AgentOwnerSchema.optional(),
  isOwner: z.boolean().optional(),
  readme: z.string().optional(),
  ephemeralBatch: z.object({
    trackingId: z.string().nullable(),
    isEphemeral: z.boolean(),
  }).nullable().optional(),
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