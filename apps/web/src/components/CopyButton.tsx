"use client";

import React from "react";
import { UI_TIMING } from "@/components/DocumentWithEvaluations/constants/uiConstants";

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
      setTimeout(() => setIsCopied(false), UI_TIMING.COPY_FEEDBACK_DURATION);
    } catch (err) {
      console.error("Failed to copy text:", err);
      setHasError(true);
      setTimeout(() => setHasError(false), UI_TIMING.COPY_ERROR_DURATION);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`text-xs transition-colors ${
        hasError 
          ? "text-red-600 hover:text-red-700" 
          : isCopied 
            ? "text-green-600" 
            : "text-gray-500 hover:text-gray-700"
      } ${className}`}
      title={hasError ? "Failed to copy - please try again" : "Copy to clipboard"}
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
      {hasError ? "Failed!" : isCopied ? "Copied!" : "Copy"}
    </button>
  );
}