"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/Button";
import {
  getLetterGrade,
  GradeBadge,
} from "@/components/GradeBadge";
import type { Agent } from "@/types/agentSchema";
import type {
  Document,
  Evaluation,
} from "@/types/documentSchema";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  DocumentTextIcon as DocumentTextIcon2,
  RectangleStackIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

import {
  createOrRerunEvaluation,
  rerunEvaluation,
} from "./actions";

interface EvaluationsClientProps {
  document: Document;
  isOwner?: boolean;
}

interface AgentWithEvaluation {
  id: string;
  name: string;
  purpose: string;
  iconName: string;
  version: string;
  description: string;
  evaluation?: Evaluation;
  isIntended: boolean;
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
  const [middleTab, setMiddleTab] = useState<"versions" | "jobs">("versions");
  const [activeTab, setActiveTab] = useState<
    "summary" | "comments" | "thinking" | "logs"
  >("summary");

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
              iconName: agent.iconName,
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
                iconName: agent.iconName,
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

  const selectedAgentWithEvaluation = agentsWithEvaluations.find(
    (agent) => agent.id === selectedReviewId
  );
  const selectedReview = selectedAgentWithEvaluation?.evaluation;

  const selectedVersion = selectedReview?.versions?.[selectedVersionIndex ?? 0];

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
          {/* Left column - Evaluations list (2 columns) */}
          <div className="col-span-2 shrink-0">
            <div className="w-[250px]">
              <div className="border-b border-gray-200 px-4 py-2">
                <h2 className="text-lg font-medium">
                  Agents ({agentsWithEvaluations.length})
                </h2>
              </div>
              <div>
                {agentsWithEvaluations.map((agentWithEval, idx) => (
                  <div
                    key={agentWithEval.id}
                    className={`cursor-pointer px-3 py-2 text-sm ${
                      selectedReviewId === agentWithEval.id
                        ? "bg-blue-50"
                        : "bg-transparent"
                    } ${idx !== agentsWithEvaluations.length - 1 ? "border-b border-gray-200" : ""}`}
                    onClick={() => {
                      setSelectedReviewId(agentWithEval.id);
                      setSelectedVersionIndex(0);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {agentWithEval.name}
                          {agentWithEval.isIntended && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                              Intended
                            </span>
                          )}
                        </div>
                        {!agentWithEval.evaluation && (
                          <div className="text-xs text-gray-500">
                            No evaluation yet
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {agentWithEval.evaluation?.versions &&
                          agentWithEval.evaluation.versions.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {agentWithEval.evaluation.versions.length}{" "}
                              versions
                            </div>
                          )}
                        {isOwner && (
                          <Button
                            variant="secondary"
                            className="flex items-center gap-1 px-2 py-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRerun(agentWithEval.id);
                            }}
                          >
                            <ArrowPathIcon className="h-3 w-3" />
                            {agentWithEval.evaluation ? "Rerun" : "Run"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle column - Version history (3 columns) */}
          <div className="col-span-3">
            {selectedAgentWithEvaluation ? (
              <div>
                {selectedReview ? (
                  <div>
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 px-4">
                      <button
                        className={`px-4 py-2 text-sm font-medium ${
                          middleTab === "versions"
                            ? "border-b-2 border-blue-500 text-blue-600"
                            : "text-gray-500 hover:text-blue-600"
                        }`}
                        onClick={() => setMiddleTab("versions")}
                      >
                        <RectangleStackIcon className="mr-1 inline-block h-4 w-4 align-text-bottom" />
                        Versions
                        {selectedReview?.versions && (
                          <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                            {selectedReview.versions.length}
                          </span>
                        )}
                      </button>
                      <button
                        className={`ml-4 px-4 py-2 text-sm font-medium ${
                          middleTab === "jobs"
                            ? "border-b-2 border-blue-500 text-blue-600"
                            : "text-gray-500 hover:text-blue-600"
                        }`}
                        onClick={() => setMiddleTab("jobs")}
                      >
                        <SparklesIcon className="mr-1 inline-block h-4 w-4 align-text-bottom" />
                        Jobs
                        {selectedReview?.jobs && (
                          <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                            {selectedReview.jobs.length}
                          </span>
                        )}
                      </button>
                    </div>
                    {/* Tab Content */}
                    <div>
                      {middleTab === "versions" && (
                        <div>
                          {selectedReview.versions &&
                          selectedReview.versions.length > 0 ? (
                            <div>
                              {selectedReview.versions.map((version, index) => (
                                <div
                                  key={index}
                                  className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                                    selectedVersionIndex === index
                                      ? "bg-blue-50"
                                      : "bg-transparent"
                                  } ${
                                    index !==
                                    (selectedReview.versions?.length ?? 0) - 1
                                      ? "border-b border-gray-200"
                                      : ""
                                  }`}
                                  onClick={() => setSelectedVersionIndex(index)}
                                >
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="font-medium text-gray-800">
                                        Version{" "}
                                        {selectedReview.versions?.length
                                          ? selectedReview.versions.length -
                                            index
                                          : 0}
                                        {index === 0 && " (Latest)"}
                                      </div>
                                      <div className="mt-1 text-xs text-gray-500">
                                        {formatDate(version.createdAt)}
                                      </div>
                                    </div>
                                    <GradeBadge grade={version.grade} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-4 text-center text-gray-500">
                              No versions available for this evaluation
                            </div>
                          )}
                        </div>
                      )}
                      {middleTab === "jobs" && (
                        <div>
                          {/* Jobs Content */}
                          {selectedReview.jobs &&
                          selectedReview.jobs.length > 0 ? (
                            <ul className="space-y-1 px-4 py-2 text-sm">
                              {selectedReview.jobs.map((job) => (
                                <li
                                  key={job.id}
                                  className="flex items-center gap-4"
                                >
                                  <span className="font-mono text-xs">
                                    {job.id.slice(0, 8)}...
                                  </span>
                                  <span className="rounded bg-gray-200 px-2 py-0.5 text-gray-700">
                                    {job.status}
                                  </span>
                                  {job.createdAt && (
                                    <span className="text-gray-500">
                                      {new Date(job.createdAt).toLocaleString()}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="py-4 text-center text-gray-500">
                              No jobs available for this evaluation
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center p-8 text-center text-gray-500">
                    <div>
                      <h3 className="mb-2 text-lg font-medium text-gray-900">
                        {selectedAgentWithEvaluation.name}
                      </h3>
                      <p className="mb-4 text-gray-500">
                        This agent hasn't been run for this document yet.
                      </p>
                      {isOwner && (
                        <Button
                          onClick={() =>
                            handleRerun(selectedAgentWithEvaluation.id)
                          }
                          className="flex items-center gap-2"
                        >
                          <SparklesIcon className="h-4 w-4" />
                          Run Evaluation
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-gray-500">
                Select an agent to view its evaluation details
              </div>
            )}
          </div>

          {/* Right column - Full version details (7 columns) */}
          {middleTab === "versions" && (
            <div className="col-span-7 overflow-hidden rounded-lg border border-gray-200 bg-white">
              {selectedVersion ? (
                <div>
                  <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                    <div className="mb-4">
                      <h2 className="text-lg font-medium">Version Details</h2>
                      <div className="mt-2 space-y-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Agent Version:</span>{" "}
                          <Link
                            href={`/agents/${selectedReview?.agentId}/versions?version=${selectedReview?.agent.version}`}
                            className="text-blue-700 hover:underline"
                          >
                            {selectedReview?.agent.name} v
                            {selectedReview?.agent.version}
                          </Link>
                        </div>
                        <div>
                          <span className="font-medium">Document Version:</span>{" "}
                          {selectedVersion?.documentVersion?.version || "1"}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span>{" "}
                          {formatDate(selectedVersion.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex space-x-4 border-b border-gray-200">
                      <button
                        onClick={() => setActiveTab("summary")}
                        className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
                          activeTab === "summary"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                      >
                        <DocumentTextIcon2 className="h-4 w-4" />
                        Summary
                      </button>
                      <button
                        onClick={() => setActiveTab("thinking")}
                        className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
                          activeTab === "thinking"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                      >
                        <SparklesIcon className="h-4 w-4" />
                        Thinking
                      </button>
                      <button
                        onClick={() => setActiveTab("comments")}
                        className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
                          activeTab === "comments"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                      >
                        <ChatBubbleLeftIcon className="h-4 w-4" />
                        Comments ({selectedVersion.comments?.length || 0})
                      </button>

                      <button
                        onClick={() => setActiveTab("logs")}
                        className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
                          activeTab === "logs"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                      >
                        <DocumentTextIcon className="h-4 w-4" />
                        Tasks
                        {selectedVersion.job?.tasks && (
                          <span className="ml-1 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                            {selectedVersion.job.tasks.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Summary Tab */}
                    {activeTab === "summary" && (
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center gap-4">
                            <GradeBadge grade={selectedVersion.grade} />
                            <div className="text-gray-700">
                              Numerical Grade: {selectedVersion.grade || 0}
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="prose max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw]}
                            >
                              {selectedVersion.summary}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Comments Tab */}
                    {activeTab === "comments" && (
                      <div className="space-y-6">
                        {selectedVersion.comments?.map((comment, index) => (
                          <div
                            key={index}
                            className="rounded-lg border border-gray-200 p-4"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <h4 className="font-medium text-gray-900">
                                {comment.title}
                              </h4>
                              {comment.grade !== undefined && (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white">
                                  {getLetterGrade(comment.grade)}
                                </div>
                              )}
                            </div>
                            <div className="prose max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                              >
                                {comment.description}
                              </ReactMarkdown>
                            </div>
                            {comment.highlight && (
                              <div className="mt-4 rounded bg-gray-50 p-4">
                                <div className="mb-2 font-medium text-gray-900">
                                  Highlighted Text
                                </div>
                                <div className="text-gray-700">
                                  {comment.highlight.quotedText}
                                </div>
                                <div className="mt-2 text-sm text-gray-500">
                                  Location: {comment.highlight.startOffset} -{" "}
                                  {comment.highlight.endOffset}
                                </div>
                              </div>
                            )}
                            {(comment.importance ||
                              comment.grade !== undefined) && (
                              <div className="mt-2 flex gap-4 text-sm text-gray-500">
                                {comment.importance && (
                                  <span>Importance: {comment.importance}</span>
                                )}
                                {comment.grade !== undefined && (
                                  <span>Grade: {comment.grade}</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Thinking Tab */}
                    {activeTab === "thinking" && (
                      <div className="space-y-6">
                        {selectedVersion.job?.llmThinking ? (
                          <div className="prose max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw]}
                            >
                              {selectedVersion.job.llmThinking}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500">
                            No thinking process available for this version
                          </div>
                        )}
                        {selectedVersion.job?.costInCents &&
                          selectedVersion.job.costInCents > 0 && (
                            <div className="mt-4 text-sm text-gray-500">
                              Cost: $
                              {(selectedVersion.job.costInCents / 100).toFixed(
                                2
                              )}
                            </div>
                          )}
                      </div>
                    )}

                    {/* Logs Tab */}
                    {activeTab === "logs" && (
                      <div className="space-y-6">
                        {selectedVersion.job?.tasks &&
                        selectedVersion.job.tasks.length > 0 ? (
                          <div className="space-y-4">
                            <div className="space-y-3">
                              {selectedVersion.job.tasks.map((task, index) => {
                                let logData;
                                try {
                                  logData = task.log
                                    ? JSON.parse(task.log)
                                    : { summary: "No log data" };
                                } catch (e) {
                                  logData = { summary: task.log };
                                }

                                return (
                                  <div
                                    key={task.id}
                                    className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                                  >
                                    <div className="mb-2 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-medium text-white">
                                          {index + 1}
                                        </span>
                                        <h4 className="font-medium text-gray-900">
                                          {task.name}
                                        </h4>
                                      </div>
                                      <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span className="rounded bg-gray-200 px-2 py-1">
                                          {task.modelName}
                                        </span>
                                        <span>
                                          $
                                          {(task.priceInCents / 100).toFixed(4)}
                                        </span>
                                        {task.timeInSeconds && (
                                          <span>{task.timeInSeconds}s</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Summary */}
                                    {logData.summary && (
                                      <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-gray-700">
                                        <strong>Summary:</strong>{" "}
                                        {logData.summary}
                                      </div>
                                    )}

                                    {/* Input/Output Details */}
                                    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                                      {logData.input && (
                                        <div className="rounded border bg-white p-3">
                                          <h5 className="mb-2 font-medium text-gray-900">
                                            Input
                                          </h5>
                                          <div className="space-y-1 text-xs text-gray-600">
                                            {Object.entries(logData.input).map(
                                              ([key, value]) => (
                                                <div key={key}>
                                                  <span className="font-medium">
                                                    {key}:
                                                  </span>{" "}
                                                  {typeof value === "string" &&
                                                  value.length > 100
                                                    ? `${value.substring(0, 100)}...`
                                                    : String(value)}
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {logData.output && (
                                        <div className="rounded border bg-white p-3">
                                          <h5 className="mb-2 font-medium text-gray-900">
                                            Output
                                          </h5>
                                          <div className="space-y-1 text-xs text-gray-600">
                                            {Object.entries(logData.output).map(
                                              ([key, value]) => (
                                                <div key={key}>
                                                  <span className="font-medium">
                                                    {key}:
                                                  </span>{" "}
                                                  {typeof value === "string" &&
                                                  value.length > 100
                                                    ? `${value.substring(0, 100)}...`
                                                    : String(value)}
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* LLM Interactions */}
                                    {logData.llmInteractions &&
                                      logData.llmInteractions.length > 0 && (
                                        <div className="mt-3">
                                          <h5 className="mb-2 font-medium text-gray-900">
                                            LLM Interactions
                                          </h5>
                                          <div className="space-y-2">
                                            {logData.llmInteractions.map(
                                              (
                                                interaction: any,
                                                idx: number
                                              ) => (
                                                <details
                                                  key={idx}
                                                  className="rounded border bg-white"
                                                >
                                                  <summary className="cursor-pointer px-3 py-2 hover:bg-gray-50">
                                                    <span className="font-medium">
                                                      Attempt{" "}
                                                      {interaction.attempt}
                                                    </span>
                                                    <span className="ml-2 text-sm text-gray-500">
                                                      (
                                                      {
                                                        interaction.validCommentsCount
                                                      }{" "}
                                                      valid,{" "}
                                                      {
                                                        interaction.failedCommentsCount
                                                      }{" "}
                                                      failed)
                                                    </span>
                                                  </summary>
                                                  <div className="border-t px-3 pb-3">
                                                    <div className="mt-2">
                                                      <h6 className="text-sm font-medium">
                                                        Prompt:
                                                      </h6>
                                                      <div className="mt-1 max-h-32 overflow-y-auto rounded bg-gray-50 p-2 text-xs text-gray-600">
                                                        {interaction.prompt}
                                                      </div>
                                                    </div>
                                                    <div className="mt-2">
                                                      <h6 className="text-sm font-medium">
                                                        Response:
                                                      </h6>
                                                      <div className="mt-1 max-h-32 overflow-y-auto rounded bg-gray-50 p-2 text-xs text-gray-600">
                                                        {interaction.response}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </details>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      )}

                                    {/* Full Log (fallback) */}
                                    {!logData.summary &&
                                      !logData.input &&
                                      !logData.output && (
                                        <div className="mt-2 rounded border bg-white p-3 text-sm text-gray-700">
                                          {task.log}
                                        </div>
                                      )}

                                    <div className="mt-2 text-xs text-gray-500">
                                      Completed:{" "}
                                      {new Date(
                                        task.createdAt
                                      ).toLocaleString()}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="mt-4 rounded-lg bg-blue-50 p-4">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-blue-900">
                                  Total Cost:
                                </span>
                                <span className="text-blue-700">
                                  $
                                  {(
                                    selectedVersion.job.tasks.reduce(
                                      (sum, task) => sum + task.priceInCents,
                                      0
                                    ) / 100
                                  ).toFixed(4)}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center justify-between text-sm">
                                <span className="font-medium text-blue-900">
                                  Total Time:
                                </span>
                                <span className="text-blue-700">
                                  {selectedVersion.job.tasks.reduce(
                                    (sum, task) =>
                                      sum + (task.timeInSeconds || 0),
                                    0
                                  )}
                                  s
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500">
                            No tasks available for this version
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center text-gray-500">
                  Select a version to view its details
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
