import Link from "next/link";

import type { Document } from "@/types/documentSchema";
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/20/solid";

interface DocumentMetadataProps {
  document: Document;
  showDetailedAnalysisLink?: boolean;
  isFullWidth?: boolean;
  onToggleFullWidth?: () => void;
}

export function DocumentMetadata({
  document,
  showDetailedAnalysisLink = false,
  isFullWidth = false,
  onToggleFullWidth,
}: DocumentMetadataProps) {
  return (
    <div className="flex items-center justify-between px-3">
      <div className="flex items-center gap-4 text-sm text-gray-600">
        {document.submittedBy && (
          <span>
            Uploaded from{" "}
            <Link
              href={`/users/${document.submittedBy.id}`}
              className="text-blue-600 hover:underline"
            >
              {document.submittedBy.name ||
                document.submittedBy.email ||
                "Unknown"}
            </Link>{" "}
            on {new Date(document.updatedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onToggleFullWidth && (
          <button
            onClick={onToggleFullWidth}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
            title={isFullWidth ? "Exit full width" : "Enter full width"}
          >
            {isFullWidth ? (
              <ArrowsPointingInIcon className="h-4 w-4" />
            ) : (
              <ArrowsPointingOutIcon className="h-4 w-4" />
            )}
            {isFullWidth ? "Exit Full Width" : "Full Width"}
          </button>
        )}
        <Link
          href={`/docs/${document.id}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
        >
          {showDetailedAnalysisLink ? "Detailed Analysis" : "Document Details"}
        </Link>
        {(document.importUrl || document.url) && (
          <Link
            href={document.importUrl || document.url}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            Source
          </Link>
        )}
      </div>
    </div>
  );
}
