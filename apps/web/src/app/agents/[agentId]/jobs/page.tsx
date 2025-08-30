"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { JobsTab } from "@/components/AgentDetail/tabs";
import type { Agent } from "@roast/ai";
import type { Job, BatchSummary } from "@/components/AgentDetail/types";

export default function JobsPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchSummary[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch agent data
        const agentResponse = await fetch(`/api/agents/${agentId}`);
        if (agentResponse.ok) {
          const agentData = await agentResponse.json();
          setAgent(agentData);
        }

        // Fetch jobs
        const jobsResponse = await fetch(`/api/agents/${agentId}/jobs`);
        if (jobsResponse.ok) {
          const jobsData = await jobsResponse.json();
          setJobs(jobsData.jobs || []);
        }

        // Fetch batches
        const batchesResponse = await fetch(`/api/agents/${agentId}/batches`);
        if (batchesResponse.ok) {
          const batchesData = await batchesResponse.json();
          setBatches(batchesData.batches || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setJobsLoading(false);
      }
    };

    if (agentId) {
      fetchData();
    }
  }, [agentId]);

  const fetchJobs = async () => {
    setJobsLoading(true);
    try {
      const response = await fetch(`/api/agents/${agentId}/jobs`);
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setJobsLoading(false);
    }
  };

  if (!agent) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-lg text-gray-600">Loading agent data...</div>
      </div>
    );
  }

  return (
    <JobsTab
      jobs={jobs}
      jobsLoading={jobsLoading}
      selectedJob={selectedJob}
      setSelectedJob={setSelectedJob}
      selectedBatchFilter={selectedBatchFilter}
      setSelectedBatchFilter={setSelectedBatchFilter}
      batches={batches}
      fetchJobs={fetchJobs}
    />
  );
}