export interface SystemAgentDefinition {
  id: string;
  name: string;
  description: string;
  readme?: string;
  primaryInstructions?: string;
  selfCritiqueInstructions?: string;
  providesGrades: boolean;
  extendedCapabilityId?: string;
}

export interface SystemAgentConfig {
  agents: SystemAgentDefinition[];
}