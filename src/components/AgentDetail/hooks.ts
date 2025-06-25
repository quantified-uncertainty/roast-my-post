import {
  useEffect,
  useState,
} from "react";

import type { Agent } from "@/types/agentSchema";
import { logger } from "@/lib/logger";
import type { AgentReview } from "@/types/evaluationSchema";
import type { EvaluationTab } from "@/components/EvaluationDetails";

import type {
  ActiveTab,
  AgentDocument,
  AgentEvaluation,
  BatchSummary,
  ExportType,
  Job,
  OverviewStats,
} from "./types";

export function useAgentDetail(agent: Agent) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [review, setReview] = useState<AgentReview | null>(null);
  const [documents, setDocuments] = useState<AgentDocument[]>([]);
  const [evaluations, setEvaluations] = useState<AgentEvaluation[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] =
    useState<AgentEvaluation | null>(null);
  const [evalDetailsTab, setEvalDetailsTab] =
    useState<EvaluationTab>("analysis");
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [evalsLoading, setEvalsLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [exportType, setExportType] = useState<ExportType>("JSON");
  const [testLoading, setTestLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string | null>(
    null
  );
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [evalsBatchFilter, setEvalsBatchFilter] = useState<string | null>(null);
  const [exportBatchFilter, setExportBatchFilter] = useState<string | null>(
    null
  );
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(
    null
  );
  const [overviewLoading, setOverviewLoading] = useState(false);

  // Fetch agent review
  useEffect(() => {
    async function fetchReview() {
      try {
        const response = await fetch(`/api/agents/${agent.id}/review`);
        const data = await response.json();
        if (data.review) {
          setReview({
            ...data.review,
            createdAt: new Date(data.review.createdAt),
          });
        }
      } catch (error) {
        logger.error('Error fetching agent review:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchReview();
  }, [agent.id]);

  // Fetch documents
  const fetchDocuments = async () => {
    if (documents.length > 0) return; // Already loaded

    setDocumentsLoading(true);
    try {
      const response = await fetch(`/api/agents/${agent.id}/documents`);
      const data = await response.json();
      if (data.documents) {
        setDocuments(data.documents);
      }
    } catch (error) {
      logger.error('Error fetching agent documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Fetch evaluations
  const fetchEvaluations = async (batchId?: string) => {
    setEvalsLoading(true);
    try {
      const url = batchId
        ? `/api/agents/${agent.id}/evaluations?batchId=${batchId}`
        : `/api/agents/${agent.id}/evaluations`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.evaluations) {
        setEvaluations(data.evaluations);
      }
    } catch (error) {
      logger.error('Error fetching agent evaluations:', error);
    } finally {
      setEvalsLoading(false);
    }
  };

  // Fetch batches
  const fetchBatches = async () => {
    if (batches.length > 0) return; // Already loaded

    setBatchesLoading(true);
    try {
      const response = await fetch(`/api/agents/${agent.id}/batches`);
      const data = await response.json();
      if (data.batches) {
        setBatches(data.batches);
      }
    } catch (error) {
      logger.error('Error fetching batches:', error);
    } finally {
      setBatchesLoading(false);
    }
  };

  // Fetch jobs
  const fetchJobs = async (batchId?: string) => {
    setJobsLoading(true);
    try {
      const url = batchId
        ? `/api/agents/${agent.id}/jobs?batchId=${batchId}`
        : `/api/agents/${agent.id}/jobs`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.jobs) {
        setJobs(data.jobs);
      }
    } catch (error) {
      logger.error('Error fetching jobs:', error);
    } finally {
      setJobsLoading(false);
    }
  };

  // Fetch overview stats
  const fetchOverviewStats = async () => {
    if (overviewStats) return; // Already loaded

    setOverviewLoading(true);
    try {
      const response = await fetch(`/api/agents/${agent.id}/overview`);
      const data = await response.json();
      if (data.stats) {
        setOverviewStats(data.stats);
      }
    } catch (error) {
      logger.error('Error fetching overview stats:', error);
    } finally {
      setOverviewLoading(false);
    }
  };

  // Auto-fetch data based on active tab
  useEffect(() => {
    if (activeTab === "overview") {
      fetchOverviewStats();
    } else if (activeTab === "documents") {
      fetchDocuments();
    } else if (activeTab === "evals") {
      fetchEvaluations(evalsBatchFilter || undefined);
    } else if (activeTab === "jobs") {
      fetchJobs(selectedBatchFilter || undefined);
    } else if (activeTab === "batches") {
      fetchBatches();
    }
  }, [activeTab, selectedBatchFilter, evalsBatchFilter]);

  return {
    // State
    activeTab,
    setActiveTab,
    review,
    documents,
    evaluations,
    selectedEvaluation,
    setSelectedEvaluation,
    evalDetailsTab,
    setEvalDetailsTab,
    loading,
    documentsLoading,
    evalsLoading,
    selectedVersion,
    setSelectedVersion,
    exportDropdownOpen,
    setExportDropdownOpen,
    copySuccess,
    setCopySuccess,
    exportType,
    setExportType,
    testLoading,
    setTestLoading,
    testSuccess,
    setTestSuccess,
    batches,
    setBatches,
    batchesLoading,
    jobs,
    jobsLoading,
    selectedBatchFilter,
    setSelectedBatchFilter,
    selectedJob,
    setSelectedJob,
    evalsBatchFilter,
    setEvalsBatchFilter,
    exportBatchFilter,
    setExportBatchFilter,
    overviewStats,
    overviewLoading,

    // Actions
    fetchDocuments,
    fetchEvaluations,
    fetchBatches,
    fetchJobs,
    fetchOverviewStats,
  };
}
