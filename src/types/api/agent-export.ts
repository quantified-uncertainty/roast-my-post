/**
 * Types for agent export data structure
 */

export interface AgentExportTask {
  name: string;
  model: string | null;
  price_in_cents: number | null;
  time_in_seconds: number | null;
  log: any;
  llm_interactions?: any;
}

export interface AgentExportJob {
  id: string;
  status: string;
  created_at: string;
  completed_at?: string;
  cost_in_cents?: number;
  attempts: number;
  error?: string | null;
  tasks: AgentExportTask[];
}

export interface AgentExportComment {
  title: string;
  description: string;
  importance?: number | null;
  grade?: number | null;
  highlight?: {
    start_offset: number;
    end_offset: number;
    prefix?: string;
    suffix?: string;
    quoted_text: string;
  };
}

export interface AgentExportEvaluation {
  id: string;
  evaluation_id: string;
  version: number;
  created_at: string;
  summary?: string;
  analysis?: string;
  self_critique?: string;
  grade?: number;
  document: {
    id: string;
    title: string;
    slug: string;
    version: number;
    created_at: string;
    submitted_by?: {
      name?: string;
      email: string;
    };
  };
  agent_version: number;
  comments: AgentExportComment[];
  job?: AgentExportJob;
}

export interface AgentExportStats {
  total_evaluations: number;
  evaluations_with_grades: number;
  average_grade: number | null;
  grade_std_dev: number | null;
  average_cost_cents: number | null;
}

export interface AgentExportData {
  agent: {
    id: string;
    name: string;
    purpose: string;
    latest_version: {
      version: number;
      name: string;
      purpose: string;
      description: string;
      primary_instructions: string;
      self_critique_instructions?: string;
      provides_grades: boolean;
      readme?: string;
    };
    submitted_by?: {
      name?: string;
      email: string;
    };
  };
  stats: AgentExportStats;
  evaluations: AgentExportEvaluation[];
  export_metadata: {
    exported_at: string;
    version?: number;
    start_date?: string;
    limit: number;
    includes_llm_interactions: boolean;
    batch_id?: string;
  };
}