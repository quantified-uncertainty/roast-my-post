"use client";

import { useState } from "react";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { exportEvaluationToXml, copyToClipboard } from "@/lib/evaluation/exportXml";

interface ExportEvaluationButtonProps {
  evaluationData: {
    evaluation: {
      id: string;
      evaluationId?: string;
      documentId: string;
      documentTitle: string;
      agentId: string;
      agentName: string;
      agentVersion?: string;
      evaluationVersion?: number | null;
      grade?: number | null;
      jobStatus?: string;
      createdAt: string | Date;
      summary?: string | null;
      analysis?: string | null;
      selfCritique?: string | null;
      comments?: Array<{
        id: string;
        description: string;
        importance?: number | null;
        grade?: number | null;
      }>;
      job?: {
        llmThinking?: string | null;
        priceInDollars?: number | string | null;
        tasks?: Array<{
          id: string;
          name: string;
          modelName: string;
          priceInDollars: number;
          timeInSeconds?: number | null;
          log?: string | null;
          createdAt: Date | string;
          llmInteractions?: Record<string, unknown>;
        }>;
      } | null;
      testBatchId?: string | null;
      testBatchName?: string | null;
    };
  };
  className?: string;
}

export function ExportEvaluationButton({ evaluationData, className = "" }: ExportEvaluationButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleExportToXml = async () => {
    const xmlContent = exportEvaluationToXml(evaluationData);
    const success = await copyToClipboard(xmlContent);
    
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const baseClassName = "inline-flex items-center gap-2 rounded-md bg-gray-600 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700";
  const combinedClassName = className ? `${baseClassName} ${className}` : baseClassName;

  return (
    <button
      onClick={handleExportToXml}
      className={combinedClassName}
    >
      {copied ? (
        <>
          <CheckIcon className="h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <ClipboardDocumentIcon className="h-4 w-4" />
          Export to XML
        </>
      )}
    </button>
  );
}