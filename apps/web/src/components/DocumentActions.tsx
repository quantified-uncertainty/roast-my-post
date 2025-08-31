"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { Button } from "./Button";
import { WarningDialog } from "./WarningDialog";
import { deleteDocument, reuploadDocument } from "@/app/docs/[docId]/reader/actions";

interface DocumentActionsProps {
  docId: string;
  document: {
    importUrl?: string | null;
    isPrivate?: boolean;
  };
  className?: string;
}

export function DocumentActions({ docId, document, className = "" }: DocumentActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReuploadWarning, setShowReuploadWarning] = useState(false);
  const [evaluationCount, setEvaluationCount] = useState(0);
  const [isTogglingPrivacy, setIsTogglingPrivacy] = useState(false);
  const [isPrivate, setIsPrivate] = useState(document.isPrivate ?? false);
  const router = useRouter();

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
    if (!confirm("Are you sure you want to delete this document and all its evaluations?")) {
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
    }
  };

  const handleConfirmReupload = () => {
    setShowReuploadWarning(false);
    performReupload();
  };

  const handleCancelReupload = () => {
    setShowReuploadWarning(false);
  };

  const handleEdit = () => {
    router.push(`/docs/${docId}/edit`);
  };

  const handleTogglePrivacy = async () => {
    setIsTogglingPrivacy(true);
    try {
      const response = await fetch(`/api/documents/${docId}/privacy`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPrivate: !isPrivate }),
      });

      if (!response.ok) {
        throw new Error('Failed to update privacy');
      }

      setIsPrivate(!isPrivate);
      router.refresh();
    } catch (error) {
      console.error('Failed to update privacy:', error);
      alert('Failed to update privacy settings');
    } finally {
      setIsTogglingPrivacy(false);
    }
  };

  return (
    <div className={`flex items-center justify-end gap-2 ${className}`}>
      <Button
        variant="secondary"
        onClick={handleTogglePrivacy}
        disabled={isTogglingPrivacy}
        className="flex items-center gap-1"
        title={isPrivate ? "Make document public" : "Make document private"}
      >
        {isPrivate ? (
          <>
            <GlobeAltIcon className="h-4 w-4" />
            Make Public
          </>
        ) : (
          <>
            <LockClosedIcon className="h-4 w-4" />
            Make Private
          </>
        )}
      </Button>

      <Button
        variant="secondary"
        onClick={handleRefresh}
        disabled={isRefreshing || !document.importUrl}
        className="flex items-center gap-1"
      >
        <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh from Source
      </Button>
      
      <Button
        variant="primary"
        onClick={handleEdit}
        className="flex items-center gap-1"
      >
        <PencilIcon className="h-4 w-4" />
        Edit
      </Button>
      
      <Button
        variant="danger"
        onClick={handleDelete}
        disabled={isDeleting}
        className="flex items-center gap-1"
      >
        <TrashIcon className="h-4 w-4" />
        Delete
      </Button>

      <WarningDialog
        isOpen={showReuploadWarning}
        title="Re-upload Document"
        message={`Re-uploading this document will create a new version and invalidate ${evaluationCount} existing evaluation${evaluationCount !== 1 ? 's' : ''}. They will be automatically re-run, which will incur API costs. Continue?`}
        confirmText="Continue with re-upload"
        onConfirm={handleConfirmReupload}
        onCancel={handleCancelReupload}
      />
    </div>
  );
}