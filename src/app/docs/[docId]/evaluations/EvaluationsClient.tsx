"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import { Button } from "@/components/Button";
import type { Agent } from "@/types/agentSchema";
import type { Document } from "@/types/documentSchema";
import {
  ArrowLeftIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

import {
  createOrRerunEvaluation,
  rerunEvaluation,
} from "./actions";
import { AgentList } from "./components/AgentList";
import { JobDetails } from "./components/JobDetails";
import { VersionDetails } from "./components/VersionDetails";
import { VersionHistory } from "./components/VersionHistory";
import type { AgentWithEvaluation } from "./types";

interface EvaluationsClientProps {
  document: Document;
  isOwner?: boolean;
}

export default function EvaluationsClient({
  document,
  isOwner,
}: EvaluationsClientProps) {
  const { reviews } = document;
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsWithEvaluations, setAgentsWithEvaluations] = useState<
    AgentWithEvaluation[]
  >([]);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<
    number | null
  >(null);
  const [selectedJobIndex, setSelectedJobIndex] = useState<number | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [middleTab, setMiddleTab] = useState<"versions" | "jobs">("versions");
  const [activeTab, setActiveTab] = useState<
    "analysis" | "comments" | "thinking" | "selfCritique" | "logs"
  >("analysis");

  // Fetch all agents and combine with evaluations
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch("/api/agents");
        const data = await response.json();
        setAgents(data.agents);

        // Create combined list of agents with evaluations
        const combined: AgentWithEvaluation[] = [];
        const intendedAgentIds = document.intendedAgents || [];
        const reviewMap = new Map(
          reviews.map((review) => [review.agentId, review])
        );

        // Add all intended agents
        for (const agentId of intendedAgentIds) {
          const agent = data.agents.find((a: Agent) => a.id === agentId);
          if (agent) {
            combined.push({
              id: agent.id,
              name: agent.name,
              purpose: agent.purpose,
              version: agent.version,
              description: agent.description,
              evaluation: reviewMap.get(agentId),
              isIntended: true,
            });
          }
        }

        // Add any agents with evaluations that aren't intended
        for (const review of reviews) {
          if (!intendedAgentIds.includes(review.agentId)) {
            const agent = data.agents.find(
              (a: Agent) => a.id === review.agentId
            );
            if (agent) {
              combined.push({
                id: agent.id,
                name: agent.name,
                purpose: agent.purpose,
                version: agent.version,
                description: agent.description,
                evaluation: review,
                isIntended: false,
              });
            }
          }
        }

        setAgentsWithEvaluations(combined);
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
    };

    fetchAgents();
  }, [document.intendedAgents, reviews]);

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRerun = async (agentId: string) => {
    // Find the agent to determine if it has an evaluation
    const agentWithEval = agentsWithEvaluations.find((a) => a.id === agentId);

    if (agentWithEval?.evaluation) {
      // Use rerunEvaluation for existing evaluations
      await rerunEvaluation(agentId, document.id);
    } else {
      // Use createOrRerunEvaluation for new evaluations
      await createOrRerunEvaluation(agentId, document.id);
    }
  };

  const selectedAgentWithEvaluation =
    agentsWithEvaluations.find((agent) => agent.id === selectedReviewId) ||
    null;
  const selectedReview = selectedAgentWithEvaluation?.evaluation || null;
  const selectedVersion =
    selectedReview?.versions?.[selectedVersionIndex ?? 0] || null;

  const handleJobSelect = async (index: number) => {
    setSelectedJobIndex(index);
    const jobId = selectedReview?.jobs?.[index]?.id;
    if (jobId) {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok) {
        const job = await res.json();
        setSelectedJob(job);
      } else {
        setSelectedJob(null);
      }
    } else {
      setSelectedJob(null);
    }
  };

  return (
    <div className="w-full px-2 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/docs/${document.id}`}>
            <Button variant="secondary" className="flex items-center gap-2">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Document
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            Evaluations for: {document.title}
          </h1>
        </div>
      </div>

      {agentsWithEvaluations.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <DocumentTextIcon className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-medium">No agents available</h3>
          <p className="mb-4 text-gray-500">
            No intended agents are configured for this document.
          </p>
          {isOwner && (
            <Link href={`/docs/${document.id}`}>
              <Button>View Document</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <AgentList
            agents={agentsWithEvaluations}
            selectedReviewId={selectedReviewId}
            isOwner={isOwner}
            onAgentSelect={setSelectedReviewId}
            onRerun={handleRerun}
          />

          <div className="col-span-3">
            <VersionHistory
              selectedAgent={selectedAgentWithEvaluation}
              selectedVersionIndex={selectedVersionIndex}
              selectedJobIndex={selectedJobIndex}
              middleTab={middleTab}
              isOwner={isOwner}
              onVersionSelect={setSelectedVersionIndex}
              onTabChange={setMiddleTab}
              onRunEvaluation={handleRerun}
              formatDate={formatDate}
              onJobSelect={handleJobSelect}
            />
          </div>

          {middleTab === "versions" && (
            <VersionDetails
              selectedVersion={selectedVersion}
              selectedReview={selectedReview}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              formatDate={formatDate}
              documentId={document.id}
              documentTitle={document.title}
            />
          )}
          {middleTab === "jobs" && selectedJob && (
            <JobDetails job={selectedJob} />
          )}
        </div>
      )}
    </div>
  );
}
