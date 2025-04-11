"use client";

import { useState } from "react";

import Image from "next/image";

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

export default function Home() {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Document Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <article className="prose prose-slate dark:prose-invert prose-lg max-w-none">
            <HighlightedMarkdown
              content={markdownContent}
              onHighlightHover={(tag) => {
                console.log("Received tag:", tag);
                setActiveTag(tag);
              }}
            />
          </article>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-64 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
        <div className="space-y-4">
          {/* File Actions */}
          <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <Image
              src="/file.svg"
              alt="File icon"
              width={16}
              height={16}
              className="dark:invert"
            />
            <span className="text-sm">File</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <Image
              src="/edit.svg"
              alt="Edit icon"
              width={16}
              height={16}
              className="dark:invert"
            />
            <span className="text-sm">Edit</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <Image
              src="/view.svg"
              alt="View icon"
              width={16}
              height={16}
              className="dark:invert"
            />
            <span className="text-sm">View</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <Image
              src="/share.svg"
              alt="Share icon"
              width={16}
              height={16}
              className="dark:invert"
            />
            <span className="text-sm">Share</span>
          </div>

          {/* Comments Section */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Comments
            </h3>
            <div className="space-y-2">
              {Object.entries(comments).map(([tag, comment]) => (
                <div
                  key={tag}
                  className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                    activeTag === tag ? "bg-gray-100 dark:bg-gray-700" : ""
                  }`}
                  onMouseEnter={() => setActiveTag(tag)}
                  onMouseLeave={() => setActiveTag(null)}
                >
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {comment}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
