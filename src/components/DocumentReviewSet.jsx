"use client";

import { useState } from "react";
import Image from "next/image";
import { DocumentReview } from "@/components/DocumentReview";

export function DocumentReviewSet({ reviews }) {
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  
  const activeReview = reviews[activeReviewIndex];
  
  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Document Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {activeReview && (
            <DocumentReview 
              title={activeReview.title} 
              content={activeReview.content} 
            />
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-64 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Documents</h3>
          <div className="space-y-1">
            {reviews.map((review, index) => (
              <div 
                key={index}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                  index === activeReviewIndex 
                    ? "bg-blue-100 dark:bg-blue-900" 
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                onClick={() => setActiveReviewIndex(index)}
              >
                <Image
                  src="/file.svg"
                  alt="Document icon"
                  width={16}
                  height={16}
                  className="dark:invert"
                />
                <span className="text-sm truncate">{review.title}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Actions</h3>
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
        </div>
      </div>
    </div>
  );
}