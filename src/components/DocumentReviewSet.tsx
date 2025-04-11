"use client";

import { useRef, useState } from "react";
import type { DocumentReviewSetData, DocumentReviewSetItem } from "@/types/documentReviewSet";
import { HighlightedMarkdown } from "@/components/HighlightedMarkdown";
import type { Comment } from "@/types/documentReview";
import { evaluationAgents } from "@/types/evaluationAgents";
import { getIcon } from "@/utils/iconMap";

interface CommentsSidebarProps {
  comments: Record<string, Comment>;
  activeTag: string | null;
  expandedTag: string | null;
  onTagHover: (tag: string | null) => void;
  onTagClick: (tag: string) => void;
}

function CommentsSidebar({
  comments,
  activeTag,
  expandedTag,
  onTagHover,
  onTagClick,
}: CommentsSidebarProps) {
  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Comments</h3>
      <div className="space-y-2">
        {Object.entries(comments).map(([tag, comment]) => {
          const Icon = comment.icon;

          return (
            <div
              key={tag}
              className={`py-2 px-2 rounded-lg hover:bg-gray-100 cursor-pointer ${
                activeTag === tag ? "bg-gray-100" : ""
              }`}
              onMouseEnter={() => onTagHover(tag)}
              onMouseLeave={() => onTagHover(null)}
              onClick={() => onTagClick(tag)}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-gray-400" />
                <div
                  className={`font-medium ${comment.color.base} px-1 rounded`}
                >
                  {comment.title}
                </div>
              </div>
              <div
                className={`text-sm text-gray-600 transition-all duration-200 ${
                  expandedTag === tag ? "" : "line-clamp-1"
                }`}
              >
                {comment.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DocumentSelectorProps {
  reviewSet: DocumentReviewSetData;
  activeDocumentId: string;
  onDocumentSelect: (documentId: string) => void;
}

interface AgentBadgeProps {
  agentId: string;
}

function AgentBadge({ agentId }: AgentBadgeProps) {
  const agent = evaluationAgents.find(a => a.id === agentId);
  
  if (!agent) return null;
  
  const IconComponent = getIcon(agent.iconName);
  
  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-white">
      <div className={`p-1 rounded-full ${agent.color}`}>
        <IconComponent className="h-3 w-3" />
      </div>
      <span className="text-xs font-medium text-gray-700">{agent.name}</span>
    </div>
  );
}

function DocumentSelector({
  reviewSet,
  activeDocumentId,
  onDocumentSelect,
}: DocumentSelectorProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{reviewSet.title}</h3>
      <p className="text-xs text-gray-500 mb-4">{reviewSet.description}</p>
      
      <div className="space-y-1">
        {reviewSet.items.map((item) => {
          const Icon = item.icon;
          const agent = evaluationAgents.find(a => a.id === item.review.agentId);
          
          return (
            <div
              key={item.id}
              className={`p-2 rounded-lg cursor-pointer ${
                activeDocumentId === item.id
                  ? "bg-blue-50 dark:bg-blue-900"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              onClick={() => onDocumentSelect(item.id)}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium truncate">{item.title}</span>
              </div>
              
              {agent && (
                <div className="flex items-center gap-1 ml-7">
                  <div className={`w-2 h-2 rounded-full ${agent.color.split(' ')[0]}`}></div>
                  <span className="text-xs text-gray-500">{agent.name}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DocumentReviewSetProps {
  reviewSet: DocumentReviewSetData;
}

export function DocumentReviewSet({ reviewSet }: DocumentReviewSetProps) {
  const [activeDocumentId, setActiveDocumentId] = useState<string>(reviewSet.items[0].id);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [expandedTag, setExpandedTag] = useState<string | null>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  // Get the active document
  const activeDocument = reviewSet.items.find(item => item.id === activeDocumentId) || reviewSet.items[0];
  
  const scrollToHighlight = (tag: string) => {
    const element = document.getElementById(`highlight-${tag}`);
    if (element && documentRef.current) {
      // Calculate the position relative to the document container
      const containerRect = documentRef.current.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const scrollTop =
        elementRect.top -
        containerRect.top +
        documentRef.current.scrollTop -
        100; // 100px offset from top

      // Smooth scroll to the element
      documentRef.current.scrollTo({
        top: scrollTop,
        behavior: "smooth",
      });
    }
  };

  const handleCommentClick = (tag: string) => {
    setExpandedTag(expandedTag === tag ? null : tag);
    scrollToHighlight(tag);
  };

  const handleHighlightClick = (tag: string) => {
    setExpandedTag(expandedTag === tag ? null : tag);
  };

  const handleDocumentSelect = (documentId: string) => {
    setActiveDocumentId(documentId);
    setActiveTag(null);
    setExpandedTag(null);
    // Reset scroll position
    if (documentRef.current) {
      documentRef.current.scrollTo({
        top: 0,
        behavior: "auto",
      });
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Document Area */}
      <div ref={documentRef} className="flex-2 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-2xl font-bold">{activeDocument.title}</h1>
            {activeDocument.review.agentId && (
              <AgentBadge agentId={activeDocument.review.agentId} />
            )}
          </div>
          <article className="prose prose-slate prose-lg max-w-none">
            <HighlightedMarkdown
              content={activeDocument.review.markdown}
              onHighlightHover={(tag) => {
                setActiveTag(tag);
              }}
              onHighlightClick={handleHighlightClick}
              highlightColors={Object.fromEntries(
                Object.entries(activeDocument.review.comments).map(
                  ([tag, comment]) => [
                    tag,
                    comment.color.base.split(" ")[0].replace("bg-", ""),
                  ]
                )
              )}
              activeTag={activeTag}
            />
          </article>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-72 border-l border-gray-200 bg-gray-50 p-4 flex-1 overflow-y-auto">
        <div className="space-y-6">
          {/* Document Selector */}
          <DocumentSelector 
            reviewSet={reviewSet}
            activeDocumentId={activeDocumentId}
            onDocumentSelect={handleDocumentSelect}
          />
          
          {/* Comments for the active document */}
          <CommentsSidebar
            comments={activeDocument.review.comments}
            activeTag={activeTag}
            expandedTag={expandedTag}
            onTagHover={setActiveTag}
            onTagClick={handleCommentClick}
          />
        </div>
      </div>
    </div>
  );
}