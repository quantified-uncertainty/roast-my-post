"use client";

import { useState } from "react";

import { HighlightedMarkdown } from "@/components/HighlightedMarkdown";

// Highlighted text with comments
const markdownContent = `
# Project Proposal

This is a {{draft document:1}} outlining our new project. 

The main {{objective:2}} is to create a collaborative document editor with real-time features.

## Key Features
- {{Real-time collaboration:3}} between multiple users
- {{Version history:4}} tracking changes over time
- {{Comment system:5}} for feedback and discussion

## Technical Requirements
1. {{WebSocket integration:6}} for live updates
2. {{Conflict resolution:7}} algorithms
3. {{Data persistence:8}} with automatic backups
`;

const comments = {
  "1": {
    title: "Document Status",
    description:
      "This document is currently in draft status and requires review from the technical team. We need to ensure all technical requirements are properly specified before moving to implementation. The current version focuses on core features, but we may need to add more detailed specifications for the real-time collaboration system.",
  },
  "2": {
    title: "Project Goal",
    description:
      "The primary objective is to create a modern, collaborative document editor that can handle multiple simultaneous users. This will require careful consideration of user experience, performance, and data consistency. We aim to achieve feature parity with existing solutions while introducing innovative collaboration features.",
  },
  "3": {
    title: "Collaboration Features",
    description:
      "The real-time collaboration system will allow multiple users to edit the same document simultaneously. This includes features like cursor presence, change tracking, and conflict resolution. We'll need to implement a robust WebSocket-based system to handle real-time updates efficiently.",
  },
  "4": {
    title: "Version Control",
    description:
      "The version history system will track all changes made to documents, allowing users to view previous versions and restore if needed. This includes automatic versioning, manual checkpoints, and the ability to compare different versions. We'll need to implement efficient storage and retrieval of document versions.",
  },
  "5": {
    title: "Commenting System",
    description:
      "The commenting system will support both inline comments and general document feedback. Users should be able to add comments to specific text selections, reply to existing comments, and resolve comment threads. The system should support rich text formatting in comments and notifications for new comments.",
  },
  "6": {
    title: "Real-time Updates",
    description:
      "WebSocket integration will handle real-time document updates and user presence. We'll need to implement efficient message batching, connection recovery, and fallback mechanisms. The system should handle network interruptions gracefully and maintain document consistency.",
  },
  "7": {
    title: "Edit Conflicts",
    description:
      "The conflict resolution system will handle concurrent edits to the same document sections. We'll implement operational transformation or similar algorithms to ensure consistency. The system should provide clear visual feedback when conflicts occur and offer intuitive resolution options.",
  },
  "8": {
    title: "Data Storage",
    description:
      "The data persistence system will automatically save document changes and maintain backup copies. We'll implement periodic cloud storage updates with efficient delta compression. The system should handle large documents efficiently and provide reliable recovery options.",
  },
};

const highlightColors = {
  "1": "red-100", // Draft status
  "2": "blue-100", // Objectives
  "3": "green-100", // Features
  "4": "green-100", // Features
  "5": "green-100", // Features
  "6": "purple-100", // Technical
  "7": "purple-100", // Technical
  "8": "purple-100", // Technical
};

interface Comment {
  title: string;
  description: string;
}

interface CommentsProps {
  comments: Record<string, Comment>;
  activeTag: string | null;
  expandedTag: string | null;
  onTagHover: (tag: string | null) => void;
  onTagClick: (tag: string) => void;
}

function Comments({
  comments,
  activeTag,
  expandedTag,
  onTagHover,
  onTagClick,
}: CommentsProps) {
  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Comments</h3>
      <div className="space-y-2">
        {Object.entries(comments).map(([tag, comment]) => (
          <div
            key={tag}
            className={`py-2 px-2 rounded-lg hover:bg-gray-100 cursor-pointer ${
              activeTag === tag ? "bg-gray-100" : ""
            }`}
            onMouseEnter={() => onTagHover(tag)}
            onMouseLeave={() => onTagHover(null)}
            onClick={() => onTagClick(tag)}
          >
            <div className="font-medium text-gray-900 mb-1">
              {comment.title}
            </div>
            <div
              className={`text-sm text-gray-600 transition-all duration-200 ${
                expandedTag === tag ? "" : "line-clamp-1"
              }`}
            >
              {comment.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [expandedTag, setExpandedTag] = useState<string | null>(null);

  const handleCommentClick = (tag: string) => {
    setExpandedTag(expandedTag === tag ? null : tag);
  };

  const handleHighlightClick = (tag: string) => {
    setExpandedTag(expandedTag === tag ? null : tag);
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Document Area */}
      <div className="flex-2 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <article className="prose prose-slate prose-lg max-w-none">
            <HighlightedMarkdown
              content={markdownContent}
              onHighlightHover={(tag) => {
                console.log("Received tag:", tag);
                setActiveTag(tag);
              }}
              onHighlightClick={handleHighlightClick}
              highlightColors={highlightColors}
              activeTag={activeTag}
            />
          </article>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-64 border-l border-gray-200 bg-gray-50 p-4 flex-1">
        <div className="space-y-4">
          <Comments
            comments={comments}
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
