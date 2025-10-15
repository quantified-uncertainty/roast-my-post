"use client";

import React from "react";
import {
  Copy as CopyIcon,
  Check as CheckIcon,
  AlertCircle,
} from "lucide-react";
import { TIMING } from "@/components/DocumentWithEvaluations/constants";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className = "" }: CopyButtonProps) {
  const [isCopied, setIsCopied] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setHasError(false);
      setTimeout(() => setIsCopied(false), TIMING.COPY_FEEDBACK_DURATION);
    } catch (err) {
      console.error("Failed to copy text:", err);
      setHasError(true);
      setTimeout(() => setHasError(false), TIMING.COPY_ERROR_DURATION);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center justify-center p-1 transition-colors ${
        hasError
          ? "text-red-600 hover:text-red-700"
          : isCopied
            ? "text-green-600 hover:text-green-700"
            : "text-gray-500 hover:text-gray-700"
      } ${className}`}
      type="button"
      title={
        hasError ? "Failed to copy - please try again" : "Copy to clipboard"
      }
      aria-label={
        hasError
          ? "Copy failed - please try again"
          : isCopied
            ? "Text copied to clipboard"
            : "Copy text to clipboard"
      }
      aria-live="polite"
      aria-atomic="true"
    >
      {hasError ? (
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
      ) : isCopied ? (
        <CheckIcon className="h-4 w-4" aria-hidden="true" />
      ) : (
        <CopyIcon className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="sr-only">
        {hasError ? "Copy failed" : isCopied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}
