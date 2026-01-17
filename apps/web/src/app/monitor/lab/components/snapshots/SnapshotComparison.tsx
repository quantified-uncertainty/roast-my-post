"use client";

import { useState } from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import type { RunSnapshot, ComparisonData, CommentMatch, Comment } from "../../types";
import { truncate } from "../../utils/formatters";
import { PipelineView } from "./PipelineView";

interface SnapshotComparisonProps {
  snapshot: RunSnapshot;
  onBack: () => void;
}

type ViewTab = "pipeline" | "comparison";

export function SnapshotComparison({ snapshot, onBack }: SnapshotComparisonProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>("pipeline");

  const comparison = snapshot.comparisonData as ComparisonData | null;
  const matched = comparison?.matchedComments ?? [];
  const newComments = comparison?.newComments ?? [];
  const lostComments = comparison?.lostComments ?? [];
  const filteredItems = comparison?.filteredItems ?? [];
  const pipelineCounts = comparison?.pipelineCounts;
  const extractionPhase = comparison?.extractionPhase;
  const stages = comparison?.stages;
  const totalDurationMs = comparison?.totalDurationMs;

  // Collect all final comments for the pipeline view
  const allFinalComments: Comment[] = [
    ...matched.map((m) => m.currentComment || m.baselineComment).filter(Boolean),
    ...newComments,
  ];

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to run
        </button>
        <h3 className="text-lg font-medium text-gray-900">{snapshot.documentTitle}</h3>
        <StatusSummary snapshot={snapshot} />
      </div>

      {/* Tab Navigation */}
      <div className="px-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          <TabButton
            active={activeTab === "pipeline"}
            onClick={() => setActiveTab("pipeline")}
            label="Pipeline View"
          />
          <TabButton
            active={activeTab === "comparison"}
            onClick={() => setActiveTab("comparison")}
            label="Baseline Comparison"
          />
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4 max-h-[calc(100vh-350px)] overflow-y-auto">
        {activeTab === "pipeline" ? (
          <PipelineView
            extraction={extractionPhase}
            counts={pipelineCounts}
            filteredItems={filteredItems}
            stages={stages}
            totalDurationMs={totalDurationMs}
            finalComments={allFinalComments}
            lostComments={lostComments}
          />
        ) : (
          <ComparisonView
            matched={matched}
            newComments={newComments}
            lostComments={lostComments}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
        active
          ? "border-blue-500 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      {label}
    </button>
  );
}

function StatusSummary({ snapshot }: { snapshot: RunSnapshot }) {
  return (
    <div className="flex items-center space-x-4 mt-2 text-sm">
      <span className={snapshot.status === "unchanged" ? "text-green-600" : "text-orange-600"}>
        {snapshot.status === "unchanged" ? "Unchanged" : "Changed"}
      </span>
      <span className="text-gray-500">|</span>
      <span className="text-green-600">{snapshot.keptCount} matched</span>
      <span className="text-cyan-600">{snapshot.newCount} new</span>
      <span className="text-red-600">{snapshot.lostCount} gone</span>
    </div>
  );
}

interface ComparisonViewProps {
  matched: CommentMatch[];
  newComments: Comment[];
  lostComments: Comment[];
}

function ComparisonView({ matched, newComments, lostComments }: ComparisonViewProps) {
  return (
    <div className="space-y-6">
      {/* Matched Comments */}
      <ComparisonSection
        title={`Matched (${matched.length})`}
        titleColor="text-green-600"
        isEmpty={matched.length === 0}
        emptyMessage="No matched comments"
      >
        {matched.map((match, i) => (
          <MatchedCommentItem key={i} match={match} />
        ))}
      </ComparisonSection>

      {/* New Comments */}
      <ComparisonSection
        title={`New in Current (${newComments.length})`}
        titleColor="text-cyan-600"
        isEmpty={newComments.length === 0}
        emptyMessage="No new comments"
      >
        {newComments.map((comment, i) => (
          <CommentItem key={i} comment={comment} />
        ))}
      </ComparisonSection>

      {/* Lost Comments */}
      <ComparisonSection
        title={`Gone from Baseline (${lostComments.length})`}
        titleColor="text-red-600"
        isEmpty={lostComments.length === 0}
        emptyMessage="No lost comments"
      >
        {lostComments.map((comment, i) => (
          <CommentItem key={i} comment={comment} />
        ))}
      </ComparisonSection>
    </div>
  );
}

interface ComparisonSectionProps {
  title: string;
  titleColor: string;
  isEmpty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}

function ComparisonSection({
  title,
  titleColor,
  isEmpty,
  emptyMessage,
  children,
}: ComparisonSectionProps) {
  return (
    <div>
      <h4 className={`text-sm font-medium ${titleColor} mb-3`}>{title}</h4>
      {isEmpty ? (
        <p className="text-sm text-gray-400 italic">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

function MatchedCommentItem({ match }: { match: CommentMatch }) {
  const comment = match.baselineComment || match.currentComment;
  if (!comment) return null;

  return (
    <div className="p-3 bg-green-50 rounded-md border border-green-100">
      <div className="text-sm">
        <span className="font-medium text-gray-900">{comment.header || "Comment"}</span>
        <span className="text-gray-500 ml-2">
          (confidence: {Math.round((match.matchConfidence ?? 1) * 100)}%)
        </span>
      </div>
      <p className="text-sm text-gray-600 mt-1">{truncate(comment.quotedText, 100)}</p>
      <p className="text-xs text-gray-500 mt-1">{truncate(comment.description, 150)}</p>
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="p-3 bg-gray-50 rounded-md">
      <div className="text-sm font-medium text-gray-900">{comment.header || "Comment"}</div>
      <p className="text-sm text-gray-600 mt-1">{truncate(comment.quotedText, 100)}</p>
      <p className="text-xs text-gray-500 mt-1">{truncate(comment.description, 150)}</p>
    </div>
  );
}
