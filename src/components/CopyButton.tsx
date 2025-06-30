"use client";

import React from "react";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className = "" }: CopyButtonProps) {
  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`text-xs transition-colors ${
        isCopied ? "text-green-600" : "text-gray-500 hover:text-gray-700"
      } ${className}`}
    >
      {isCopied ? "Copied!" : "Copy"}
    </button>
  );
}