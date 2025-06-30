"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { reuploadDocument } from "@/app/docs/[docId]/preview/actions";

interface ReuploadButtonProps {
  docId: string;
  className?: string;
}

export function ReuploadButton({ docId, className = "" }: ReuploadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleReupload = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const result = await reuploadDocument(docId);
      
      if (result.success) {
        // Refresh the current page to show updated content
        router.refresh();
      } else {
        alert(result.error || "Failed to re-upload document");
      }
    } catch (error) {
      console.error("Error re-uploading document:", error);
      alert("An unexpected error occurred while re-uploading the document");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleReupload}
      disabled={isLoading}
      className={`inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <ArrowUpTrayIcon className={`mr-2 h-4 w-4 ${isLoading ? "animate-pulse" : ""}`} />
      {isLoading ? "Refreshing..." : "Refresh from Source"}
    </button>
  );
}