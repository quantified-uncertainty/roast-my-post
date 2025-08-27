"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { rerunEvaluation } from "@/app/docs/[docId]/actions/evaluation-actions";

interface UseEvaluationRerunOptions {
  documentId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Custom hook for handling evaluation reruns with consistent loading state and error handling
 */
export function useEvaluationRerun({ 
  documentId, 
  onSuccess,
  onError 
}: UseEvaluationRerunOptions) {
  const router = useRouter();
  const [runningEvals, setRunningEvals] = useState<Set<string>>(new Set());

  const handleRerun = useCallback(async (agentId: string) => {
    setRunningEvals(prev => new Set([...prev, agentId]));
    
    try {
      const result = await rerunEvaluation(agentId, documentId);
      
      if (result.success) {
        router.refresh();
        onSuccess?.();
      } else {
        const errorMessage = result.error || 'Failed to rerun evaluation';
        console.error('Failed to rerun evaluation:', errorMessage);
        onError?.(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Failed to rerun evaluation:', error);
      onError?.(errorMessage);
    } finally {
      setRunningEvals(prev => {
        const next = new Set(prev);
        next.delete(agentId);
        return next;
      });
    }
  }, [documentId, router, onSuccess, onError]);

  const isRunning = useCallback((agentId: string) => {
    return runningEvals.has(agentId);
  }, [runningEvals]);

  return {
    handleRerun,
    runningEvals,
    isRunning,
  };
}