import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import {
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  LightBulbIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";

import { GradeBadge } from "@/components/GradeBadge";
import { TaskLogs } from "@/app/docs/[docId]/evaluations/components/TaskLogs";

export type EvaluationTab = "analysis" | "summary" | "comments" | "selfCritique" | "logs";

interface Comment {
  id: string;
  title: string;
  description: string;
  importance?: number | null;
  grade?: number | null;
}

interface EvaluationDetailsProps {
  activeTab: EvaluationTab;
  setActiveTab: (tab: EvaluationTab) => void;
  summary?: string | null;
  analysis?: string | null;
  selfCritique?: string | null;
  comments?: Comment[];
  job?: {
    llmThinking?: string | null;
    costInCents?: number | null;
    tasks?: Array<{
      id: string;
      name: string;
      modelName: string;
      priceInCents: number;
      timeInSeconds?: number | null;
      log?: string | null;
      createdAt: Date;
      llmInteractions?: any;
    }>;
  } | null;
  createdAt: string | Date;
}

export function EvaluationDetails({
  activeTab,
  setActiveTab,
  summary,
  analysis,
  selfCritique,
  comments = [],
  job,
  createdAt,
}: EvaluationDetailsProps) {
  const tabs = [
    { id: "analysis" as const, label: "Analysis", icon: DocumentTextIcon },
    { id: "summary" as const, label: "Summary", icon: ListBulletIcon },
    { 
      id: "comments" as const, 
      label: `Comments (${comments.length})`, 
      icon: ChatBubbleLeftIcon 
    },
    { id: "selfCritique" as const, label: "Self-Critique", icon: LightBulbIcon },
    { id: "logs" as const, label: "Logs", icon: ListBulletIcon },
  ];

  return (
    <>
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
              disabled={
                (tab.id === "selfCritique" && !selfCritique) ||
                (tab.id === "logs" && !job)
              }
            >
              <tab.icon
                className={`-ml-0.5 mr-2 h-5 w-5 ${
                  activeTab === tab.id
                    ? "text-blue-500"
                    : "text-gray-400 group-hover:text-gray-500"
                }`}
              />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="max-h-[calc(100vh-400px)] overflow-y-auto p-6">
        {activeTab === "analysis" && (
          <div className="prose prose-sm max-w-none">
            {analysis ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {analysis}
              </ReactMarkdown>
            ) : (
              <div className="py-8 text-center text-gray-500">
                No analysis available for this evaluation
              </div>
            )}
          </div>
        )}

        {activeTab === "summary" && (
          <div className="prose prose-sm max-w-none">
            {summary ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {summary}
              </ReactMarkdown>
            ) : (
              <div className="py-8 text-center text-gray-500">
                No summary available for this evaluation
              </div>
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No comments for this evaluation
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">
                      {comment.title}
                    </h4>
                    <div className="flex items-center space-x-2">
                      {comment.grade && <GradeBadge grade={comment.grade} />}
                      {comment.importance && (
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                          Importance: {comment.importance}/10
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="prose prose-sm text-gray-700">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                    >
                      {comment.description}
                    </ReactMarkdown>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "selfCritique" && (
          <div className="prose prose-sm max-w-none">
            {selfCritique ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {selfCritique}
              </ReactMarkdown>
            ) : (
              <div className="py-8 text-center text-gray-500">
                No self-critique available for this evaluation
              </div>
            )}
          </div>
        )}

        {activeTab === "logs" && (
          <div>
            {job ? (
              <TaskLogs
                selectedVersion={{
                  createdAt: new Date(createdAt),
                  comments: [],
                  summary: summary || "",
                  documentVersion: { version: 0 },
                  job: {
                    tasks: (job.tasks || []).map((task) => ({
                      ...task,
                      log: task.log || null,
                      timeInSeconds: task.timeInSeconds || null,
                    })),
                    costInCents: job.costInCents || 0,
                    llmThinking: job.llmThinking || "",
                  },
                }}
              />
            ) : (
              <div className="py-8 text-center text-gray-500">
                No logs available for this evaluation
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}