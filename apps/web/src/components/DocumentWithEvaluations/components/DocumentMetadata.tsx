"use client";

import Link from "next/link";

import type { Document } from "@/shared/types/databaseTypes";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { PenTool, ExternalLink } from "lucide-react";
import { UI_LABELS } from "@/constants/ui-labels";

interface DocumentMetadataProps {
  document: Document;
  showDetailedAnalysisLink?: boolean;
}

export function DocumentMetadata({
  document,
  showDetailedAnalysisLink = false,
}: DocumentMetadataProps) {
  return (
    <div className="flex items-center justify-between px-3">
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
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
        >
          <Link href={`/docs/${document.id}`}>
            <PenTool className="h-4 w-4" />
            <span className="hidden sm:inline">
              {showDetailedAnalysisLink ? UI_LABELS.EVAL_EDITOR.label : "Document Details"}
            </span>
          </Link>
        </Button>
        {(document.importUrl || document.url) && (
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link
              href={document.importUrl || document.url || ""}
              target="_blank"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Source</span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
