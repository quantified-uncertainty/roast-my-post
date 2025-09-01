import Link from "next/link";

import type { Agent } from "@roast/ai";

import { StatusBadge } from "../components";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import type { AgentDocument } from "../types";
import {
  formatDate,
} from "../utils";

interface DocumentsTabProps {
  agent: Agent;
  documents: AgentDocument[];
  documentsLoading: boolean;
}

export function DocumentsTab({
  agent,
  documents,
  documentsLoading,
}: DocumentsTabProps) {
  return (
    <div className="space-y-6">
      {documentsLoading ? (
        <div className="py-8 text-center">
          <div className="text-gray-500">Loading documents...</div>
        </div>
      ) : documents.length === 0 ? (
        <div className="py-8 text-center">
          <div className="text-gray-500">
            No documents have been evaluated by this agent yet.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Evaluations ({documents.length})
          </h3>
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.evaluationId}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="flex items-center gap-2 text-lg font-medium text-gray-900">
                          <Link
                            href={`/docs/${doc.id}/evals/${agent.id}`}
                            className="transition-colors hover:text-blue-600"
                          >
                            {doc.title}
                          </Link>
                          {doc.isPrivate && <PrivacyBadge isPrivate={true} variant="badge" size="xs" />}
                        </h4>
                        <p className="text-sm text-gray-500">
                          By {doc.author} • Published{" "}
                          {formatDate(doc.publishedDate)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Evaluated {formatDate(doc.evaluationCreatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {agent.providesGrades && doc.grade !== undefined && (
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">
                              {doc.grade}/100
                            </div>
                            <div className="text-xs text-gray-500">Grade</div>
                          </div>
                        )}
                        <StatusBadge status={doc.jobStatus} />
                      </div>
                    </div>

                    {doc.summary && (
                      <div className="mt-3">
                        <p className="line-clamp-3 text-sm text-gray-700">
                          {doc.summary}
                        </p>
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                      {doc.priceInDollars && (
                        <span>Cost: ${Number(doc.priceInDollars).toFixed(2)}</span>
                      )}
                      {doc.jobCompletedAt && (
                        <span>Completed: {formatDate(doc.jobCompletedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
