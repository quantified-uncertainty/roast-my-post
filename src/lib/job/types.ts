// Shared job interface that all components can use
export interface JobData {
  id: string;
  status: string;
  createdAt: string | Date;
  completedAt?: string | Date | null;
  startedAt?: string | Date | null;
  durationInSeconds?: number | null;
  costInCents?: number | null;
  attempts?: number;
  originalJobId?: string | null;
  error?: string | null;
  
  // Optional relational data
  evaluation?: {
    document: {
      id: string;
      versions: Array<{
        title: string;
      }>;
    };
    agent: {
      id: string;
      versions: Array<{
        name: string;
      }>;
    };
  };
  
  // Alternative document/agent structure
  document?: {
    id: string;
    title: string;
  };
  agent?: {
    id: string;
    name: string;
  };
  
  // Batch information
  batch?: {
    id: string;
    name?: string;
  };
  
  // Task information
  tasks?: Array<{
    id: string;
    name: string;
    modelName: string;
    priceInDollars: number;
    timeInSeconds: number | null;
    log: string | null;
    llmInteractions?: unknown;
    createdAt: Date;
  }>;
}