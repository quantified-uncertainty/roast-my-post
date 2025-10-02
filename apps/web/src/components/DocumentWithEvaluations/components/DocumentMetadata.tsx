"use client";

import Link from "next/link";

import { PrivacyBadge } from "@/components/PrivacyBadge";
import { ROUTES } from "@/constants/routes";
import type { Document } from "@/shared/types/databaseTypes";

import { DocumentActions } from "./DocumentActions";

interface DocumentMetadataProps {
  document: Document;
  isFullWidth?: boolean;
  onToggleFullWidth?: () => void;
}

export function DocumentMetadata({
  document,
  isFullWidth = false,
  onToggleFullWidth,
}: DocumentMetadataProps) {
  return (
    <div className={`flex ${isFullWidth ? "px-5" : "justify-center"}`}>
      <div
        className="flex w-full items-center justify-between"
        style={!isFullWidth ? { maxWidth: "calc(48rem + 700px + 2rem)" } : {}}
      >
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <PrivacyBadge isPrivate={!!document.isPrivate} variant="text" />
          {!document.isPrivate && document.submittedBy && (
            <>
              <span className="text-gray-300">•</span>
              <span>
                Submitted by{" "}
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
          isFullWidth={isFullWidth}
          onToggleFullWidth={onToggleFullWidth}
        />
      </div>
    </div>
  );
}
