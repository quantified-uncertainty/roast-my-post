"use client";

import Link from "next/link";

import { PrivacyBadge } from "@/components/PrivacyBadge";
import { ROUTES } from "@/constants/routes";
import type { Document } from "@/shared/types/databaseTypes";
import { CommentActions } from "./CommentActions";
import { DocumentActions } from "./DocumentActions";

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
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <PrivacyBadge isPrivate={!!document.isPrivate} variant="text" />
          {document.submittedBy && (
            <>
              <span className="text-gray-300">•</span>
              <span>
                Uploaded from{" "}
                <Link
                  href={ROUTES.USERS.PROFILE(document.submittedBy.id)}
                  className="text-blue-600 hover:underline"
                >
                  {document.submittedBy.name ||
                    document.submittedBy.email ||
                    "Unknown"}
                </Link>{" "}
                on {new Date(document.updatedAt).toLocaleDateString()}
              </span>
            </>
          )}
        </div>
        <DocumentActions
          document={document}
          showDetailedAnalysisLink={showDetailedAnalysisLink}
        />
      </div>

      <CommentActions
        document={document}
        isFullWidth={isFullWidth}
        onToggleFullWidth={onToggleFullWidth}
      />
    </div>
  );
}
