import type { Agent } from "@roast/ai";

export interface AgentDetailProps {
  agent: Agent;
  isOwner?: boolean;
  isAdmin?: boolean;
}

export interface AgentDocument {
  id: string;
  title: string;
  author: string;
  publishedDate: string;
  evaluationId: string;
  evaluationCreatedAt: string;
  summary?: string;
  analysis?: string;
  grade?: number | null;
  jobStatus?: string;
  jobCreatedAt?: string;
  jobCompletedAt?: string;
  priceInDollars?: number;
}

export interface AgentEvaluation {
  id: string;
  evaluationId: string;
  documentId: string;
  documentTitle: string;
  documentAuthor: string;
  agentVersion: number | string;
  agentVersionName?: string;
  evaluationVersion?: number | null;
  summary?: string | null;
  analysis?: string | null;
  grade?: number | null;
  selfCritique?: string | null;
  createdAt: string;
  jobStatus?: string;
  jobCreatedAt?: string;
  jobCompletedAt?: string;
  priceInDollars?: number;
  comments?: Array<{
    id: string;
    title: string;
    description: string;
    importance?: number | null;
    grade?: number | null;
    header?: string | null;
    level?: string | null;
    source?: string | null;
    metadata?: any | null;
  }>;
  job?: {
    status: string;
    llmThinking?: string | null;
    priceInDollars?: number | string | null;
    tasks?: Array<{
      id: string;
      name: string;
      modelName: string;
      priceInDollars: number;
      timeInSeconds?: number | null;
      log?: string | null;
      createdAt: Date;
      llmInteractions?: any;
    }>;
  };
}

export interface BatchSummary {
  id: string;
  name: string | null;
  targetCount: number;
  createdAt: string;
  progress: number;
  completedCount: number;
  runningCount: number;
  failedCount: number;
  pendingCount: number;
  totalCost: number;
  avgDuration: number;
  avgGrade: number | null;
  isComplete: boolean;
}

export interface Job {
  id: string;
  status: string;
  document: {
    id: string;
    title: string;
  };
  agent: {
    id: string;
    name: string;
  };
  batch?: {
    id: string;
    name?: string;
  };
  createdAt: string;
  completedAt?: string;
  durationInSeconds?: number;
  priceInDollars?: number;
  error?: string;
  attempts?: number;
  originalJobId?: string | null;
}

export interface OverviewStats {
  totalEvaluations: number;
  averageGrade: number | null;
  totalCost: number;
  averageCost: number;
  averageTime: number;
  successRate: number;
  uniqueDocuments: number;
  activeJobs: number;
  createdAt: string;
  updatedAt: string;
  recentEvaluations?: Array<{
    id: string;
    documentId: string;
    documentTitle: string;
    createdAt: string;
    grade?: number;
    status: string;
  }>;
}

export type ActiveTab =
  | "overview"
  | "details"
  | "documents"
  | "evals"
  | "jobs"
  | "test"
  | "batches"
  | "export";
export type ExportType = "JSON" | "Markdown" | "YAML";
