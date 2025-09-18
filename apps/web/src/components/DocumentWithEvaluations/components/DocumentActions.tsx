"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { UI_LABELS } from "@/constants/ui-labels";
import type { Document } from "@/shared/types/databaseTypes";
import { ExternalLink, Microscope } from "lucide-react";

interface DocumentActionsProps {
  document: Document;
  showDetailedAnalysisLink?: boolean;
}

export function DocumentActions({
  document,
  showDetailedAnalysisLink = false,
}: DocumentActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" asChild className="h-8 px-3 text-xs">
        <Link href={`/docs/${document.id}`}>
          <Microscope className="mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {showDetailedAnalysisLink
              ? UI_LABELS.EVAL_EDITOR.label
              : "Document Details"}
          </span>
        </Link>
      </Button>
      {(document.importUrl || document.url) && (
        <Button
          variant="outline"
          size="sm"
          asChild
          className="h-8 px-3 text-xs"
        >
          <Link href={document.importUrl || document.url || ""} target="_blank">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Source
          </Link>
        </Button>
      )}
    </div>
  );
}
