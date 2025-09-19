"use client";

import {
  Download,
  ExternalLink,
  Microscope,
} from "lucide-react";
import Link from "next/link";
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/20/solid";

import { Button } from "@/components/ui/button";
import { UI_LABELS } from "@/constants/ui-labels";
import type { Document } from "@/shared/types/databaseTypes";

interface DocumentActionsProps {
  document: Document;
  showDetailedAnalysisLink?: boolean;
  isFullWidth?: boolean;
  onToggleFullWidth?: () => void;
}

export function DocumentActions({
  document,
  showDetailedAnalysisLink = false,
  isFullWidth = false,
  onToggleFullWidth,
}: DocumentActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        asChild
        className="h-8 px-3 text-xs"
      >
        <Link href={`/docs/${document.id}`}>
          <Microscope className="mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {showDetailedAnalysisLink
              ? UI_LABELS.EVAL_EDITOR.label
              : "Document Details"}
          </span>
        </Link>
      </Button>
      <Button
        variant="secondary"
        size="sm"
        asChild
        className="h-8 px-3 text-xs"
      >
        <Link href={`/docs/${document.id}/export`}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </Link>
      </Button>
      {(document.importUrl || document.url) && (
        <Button
          variant="secondary"
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
      {onToggleFullWidth && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onToggleFullWidth}
          className="h-8 px-3 text-xs"
          title={isFullWidth ? "Exit full width" : "Enter full width"}
        >
          {isFullWidth ? (
            <ArrowsPointingInIcon className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <ArrowsPointingOutIcon className="mr-1.5 h-3.5 w-3.5" />
          )}
          {isFullWidth ? "Exit Full Width" : "Full Width"}
        </Button>
      )}
    </div>
  );
}
