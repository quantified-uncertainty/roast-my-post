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
  "1": "This is still a work in progress and needs review",
  "2": "Primary goal of the project",
  "3": "Similar to Google Docs collaboration",
  "4": "Track all changes with timestamps",
  "5": "Allow inline comments and discussions",
  "6": "Using Socket.io for real-time updates",
  "7": "Handle concurrent edits gracefully",
  "8": "Save to cloud storage every 5 minutes",
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

export default function Home() {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-white">
      {/* Document Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <article className="prose prose-slate prose-lg max-w-none">
            <HighlightedMarkdown
              content={markdownContent}
              onHighlightHover={(tag) => {
                console.log("Received tag:", tag);
                setActiveTag(tag);
              }}
              highlightColors={highlightColors}
              activeTag={activeTag}
            />
          </article>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-64 border-l border-gray-200 bg-gray-50 p-4">
        <div className="space-y-4">
          {/* Comments Section */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Comments
            </h3>
            <div className="space-y-2">
              {Object.entries(comments).map(([tag, comment]) => (
                <div
                  key={tag}
                  className={`p-2 rounded-lg hover:bg-gray-100 cursor-pointer ${
                    activeTag === tag ? "bg-gray-100" : ""
                  }`}
                  onMouseEnter={() => setActiveTag(tag)}
                  onMouseLeave={() => setActiveTag(null)}
                >
                  <div className="text-sm text-gray-600">{comment}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
