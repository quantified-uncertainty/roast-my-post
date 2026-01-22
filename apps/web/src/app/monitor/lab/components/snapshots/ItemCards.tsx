"use client";

import { useState } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import type { FilteredItem, PassedItem, Comment } from "../../types";
import { truncate } from "../../utils/formatters";
import { getFilterStageBadgeText } from "./pipelineUtils";

/**
 * Card component for displaying a filtered item (removed by a filter stage)
 */
export function FilteredItemCard({ item }: { item: FilteredItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-3 bg-orange-50 rounded-md border border-orange-100">
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="px-1.5 py-0.5 bg-orange-200 text-orange-800 rounded text-xs">
              {getFilterStageBadgeText(item.stage)}
            </span>
            {item.header && (
              <span className="text-xs text-orange-700">[{item.header}]</span>
            )}
          </div>
          <p className="text-sm text-gray-700 mt-1">{truncate(item.quotedText, 80)}</p>
        </div>
        <ChevronRightIcon
          className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-orange-200">
          <p className="text-xs text-gray-600">
            <span className="font-medium">Reason:</span> {item.filterReason}
          </p>
          {item.supportLocation && (
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-medium">Support found at:</span> {item.supportLocation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Card component for displaying a comment (kept or lost)
 */
export function CommentCard({ comment, variant }: { comment: Comment; variant: "kept" | "lost" }) {
  const [expanded, setExpanded] = useState(false);
  const bgColor = variant === "kept" ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100";

  return (
    <div className={`p-3 rounded-md border ${bgColor}`}>
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900">{comment.header || "Comment"}</span>
          <p className="text-sm text-gray-600 mt-1">{truncate(comment.quotedText, 80)}</p>
        </div>
        <ChevronRightIcon
          className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">{comment.description}</p>
          {comment.importance && (
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-medium">Importance:</span> {comment.importance}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Card component for displaying a passed item (kept by a filter stage)
 */
export function PassedItemCard({ item }: { item: PassedItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-3 bg-green-50 rounded-md border border-green-100">
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="px-1.5 py-0.5 bg-green-200 text-green-800 rounded text-xs">
              Kept
            </span>
            {item.header && (
              <span className="text-xs text-green-700">[{item.header}]</span>
            )}
          </div>
          <p className="text-sm text-gray-700 mt-1">{truncate(item.quotedText, 80)}</p>
        </div>
        <ChevronRightIcon
          className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <p className="text-xs text-gray-600">
            <span className="font-medium">Why it passed:</span> {item.passReason}
          </p>
        </div>
      )}
    </div>
  );
}
