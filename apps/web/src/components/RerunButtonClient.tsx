"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rerunEvaluation, createOrRerunEvaluation } from "@/app/docs/[docId]/actions/evaluation-actions";

interface RerunButtonClientProps {
  agentId: string;
  documentId: string;
  isOwner: boolean;
  hasExistingEvaluation: boolean;
}

export function RerunButtonClient({ 
  agentId, 
  documentId, 
  isOwner, 
  hasExistingEvaluation
}: RerunButtonClientProps) {
  const [isTriggered, setIsTriggered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  if (!isOwner) {
    return null;
  }

  const handleRerun = async () => {
    setIsLoading(true);
    try {
      let result;
      if (hasExistingEvaluation) {
        result = await rerunEvaluation(agentId, documentId);
      } else {
        result = await createOrRerunEvaluation(agentId, documentId);
      }

      if (result.success) {
        setIsTriggered(true);
        // Refresh the page after a short delay
        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else {
        console.error("Failed to trigger rerun:", result.error);
      }
    } catch (error) {
      console.error("Error triggering rerun:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isTriggered) {
    return (
      <span className="text-sm text-green-600 font-medium">
        Rerun triggered
      </span>
    );
  }

  return (
    <button
      onClick={handleRerun}
      disabled={isLoading}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? "Triggering..." : "Rerun"}
    </button>
  );
}