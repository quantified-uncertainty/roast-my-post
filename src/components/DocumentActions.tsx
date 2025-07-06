"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Button } from "./Button";
import { deleteDocument, reuploadDocument } from "@/app/docs/[docId]/reader/actions";

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
  const [showReuploadWarning, setShowReuploadWarning] = useState(false);
  const [evaluationCount, setEvaluationCount] = useState(0);
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

      {/* Reupload Warning Dialog */}
      {showReuploadWarning && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCancelReupload} />
            
            <div className="relative inline-block rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-base font-semibold leading-6 text-gray-900">
                    Re-upload Document
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Re-uploading this document will create a new version and invalidate {evaluationCount} existing evaluation{evaluationCount !== 1 ? 's' : ''}. 
                      They will be automatically re-run, which will incur API costs. Continue?
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-yellow-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-500 sm:ml-3 sm:w-auto"
                  onClick={handleConfirmReupload}
                >
                  Continue with re-upload
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  onClick={handleCancelReupload}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}