'use client';

import { useState } from 'react';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

interface CopyMarkdownButtonProps {
  content: string;
  className?: string;
}

export function CopyMarkdownButton({ content, className = '' }: CopyMarkdownButtonProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={copyToClipboard}
      className={`inline-flex items-center rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 ${className}`}
      title="Copy as Markdown"
    >
      {copied ? (
        <>
          <CheckIcon className="mr-2 h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <ClipboardDocumentIcon className="mr-2 h-4 w-4" />
          Copy as MD
        </>
      )}
    </button>
  );
}