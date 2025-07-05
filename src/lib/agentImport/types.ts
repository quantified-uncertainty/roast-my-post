import { z } from 'zod';

// Schema for agent configuration (matching existing YAML import)
export const AgentConfigSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000),
  primaryInstructions: z.string().min(1).max(50000),
  selfCritiqueInstructions: z.string().max(20000).optional(),
  providesGrades: z.boolean().default(false),
  extendedCapabilityId: z.string().nullable().optional(),
  readme: z.string().optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url?: string;
}

export interface VerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}