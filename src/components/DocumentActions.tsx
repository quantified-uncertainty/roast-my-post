"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Button } from "./Button";
import { deleteDocument, reuploadDocument } from "@/app/docs/[docId]/preview/actions";

interface DocumentActionsProps {
  docId: string;
  document: {
    importUrl?: string | null;
  };
  className?: string;
}

export function DocumentActions({ docId, document, className = "" }: DocumentActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

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

    if (!confirm("This will update the document content from the source URL. Continue?")) {
      return;
    }

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
    }
  };

  const handleEdit = () => {
    router.push(`/docs/${docId}/edit`);
  };

  return (
    <div className={`flex items-center justify-end gap-2 ${className}`}>
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
    </div>
  );
}