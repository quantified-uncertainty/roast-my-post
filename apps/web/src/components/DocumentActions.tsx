"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import {
  deleteDocument,
  reuploadDocument,
} from "@/app/docs/[docId]/reader/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowPathIcon,
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import { WarningDialog } from "./WarningDialog";

// Helper function to check if a URL is from Substack
function isSubstackUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("substack.com");
}

interface DocumentActionsProps {
  docId: string;
  document: {
    importUrl?: string | null;
    isPrivate?: boolean;
  };
  className?: string;
}

export function DocumentActions({
  docId,
  document,
  className = "",
}: DocumentActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReuploadWarning, setShowReuploadWarning] = useState(false);
  const [showSubstackWarning, setShowSubstackWarning] = useState(false);
  const [evaluationCount, setEvaluationCount] = useState(0);
  const router = useRouter();
  
  const isSubstack = isSubstackUrl(document.importUrl);

  useEffect(() => {
    // Fetch evaluation count
    const fetchEvaluationCount = async () => {
      try {
        const response = await fetch(`/api/documents/${docId}`);
        if (response.ok) {
          const doc = await response.json();
          setEvaluationCount(doc.reviews?.length || 0);
        }
      } catch (error) {
        console.error("Failed to fetch document:", error);
      }
    };
    fetchEvaluationCount();
  }, [docId]);

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this document and all its evaluations?"
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteDocument(docId);
      router.push("/");
    } catch (error) {
      console.error("Failed to delete document:", error);
      alert("Failed to delete document");
      setIsDeleting(false);
    }
  };

  const handleRefresh = async () => {
    if (!document.importUrl) {
      alert("This document doesn't have a source URL to refresh from.");
      return;
    }

    // Show Substack-specific warning first
    if (isSubstack) {
      setShowSubstackWarning(true);
      return;
    }

    // Show warning dialog if there are evaluations
    if (evaluationCount > 0) {
      setShowReuploadWarning(true);
      return;
    }

    // If no evaluations, proceed directly
    performReupload();
  };

  const performReupload = async () => {
    setIsRefreshing(true);
    try {
      await reuploadDocument(docId);
      router.refresh();
      alert("Document refreshed successfully!");
    } catch (error) {
      console.error("Failed to refresh document:", error);
      alert("Failed to refresh document");
    } finally {
      setIsRefreshing(false);
      setShowReuploadWarning(false);
      setShowSubstackWarning(false);
    }
  };

  const handleConfirmReupload = () => {
    setShowReuploadWarning(false);
    performReupload();
  };

  const handleCancelReupload = () => {
    setShowReuploadWarning(false);
  };

  const handleConfirmSubstackRefresh = () => {
    setShowSubstackWarning(false);
    // After acknowledging Substack warning, check for evaluation warning
    if (evaluationCount > 0) {
      setShowReuploadWarning(true);
    } else {
      performReupload();
    }
  };

  const handleCancelSubstackRefresh = () => {
    setShowSubstackWarning(false);
  };

  const handleEdit = () => {
    router.push(`/docs/${docId}/edit`);
  };

  return (
    <div className={`flex items-center justify-end gap-2 ${className}`}>
      <Button variant="outline" size="sm" onClick={handleEdit}>
        <PencilIcon className="h-3.5 w-3.5" />
        Edit
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="px-2">
            <EllipsisHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={handleRefresh}
            disabled={isRefreshing || !document.importUrl}
          >
            <ArrowPathIcon
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh from Source
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-destructive"
          >
            <TrashIcon className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <WarningDialog
        isOpen={showSubstackWarning}
        title="Substack Refresh Warning"
        message="Refreshing Substack articles may not work reliably. Substack uses aggressive caching, and the refresh may return an old version of the article instead of the latest content. Consider manually editing the document if you need the most recent version."
        confirmText="Continue anyway"
        cancelText="Cancel"
        onConfirm={handleConfirmSubstackRefresh}
        onCancel={handleCancelSubstackRefresh}
      />

      <WarningDialog
        isOpen={showReuploadWarning}
        title="Re-upload Document"
        message={`Re-uploading this document will create a new version and invalidate ${evaluationCount} existing evaluation${evaluationCount !== 1 ? "s" : ""}. They will be automatically re-run, which will incur API costs. Continue?`}
        confirmText="Continue with re-upload"
        onConfirm={handleConfirmReupload}
        onCancel={handleCancelReupload}
      />
    </div>
  );
}
