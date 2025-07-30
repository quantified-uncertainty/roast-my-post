"use client";

import Link from "next/link";
import { useState, useCallback } from "react";

import type { Document } from "@/types/documentSchema";
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  ArrowTopRightOnSquareIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from "@heroicons/react/20/solid";

interface DocumentMetadataProps {
  document: Document;
  showDetailedAnalysisLink?: boolean;
  isFullWidth?: boolean;
  onToggleFullWidth?: () => void;
}

export function DocumentMetadata({
  document,
  showDetailedAnalysisLink = false,
  isFullWidth = false,
  onToggleFullWidth,
}: DocumentMetadataProps) {
  const [exportMode, setExportMode] = useState<'download' | 'clipboard'>('download');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleExport = useCallback(async (format: string) => {
    if (exportMode === 'clipboard') {
      try {
        const response = await fetch(`/api/documents/${document.id}/export?format=${format}`);
        const text = await response.text();
        await navigator.clipboard.writeText(text);
        
        // Show success feedback
        setCopiedFormat(format);
        setTimeout(() => setCopiedFormat(null), 2000);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    } else {
      // Download mode - use existing anchor tag behavior
      window.location.href = `/api/documents/${document.id}/export?format=${format}`;
    }
  }, [document.id, exportMode]);

  // Reset to download mode when dropdown closes
  const handleMouseLeave = useCallback(() => {
    setDropdownOpen(false);
    // Reset state after a small delay to allow for smooth transition
    setTimeout(() => {
      setExportMode('download');
      setCopiedFormat(null);
    }, 200);
  }, []);
  return (
    <div className="flex items-center justify-between px-3">
      <div className="flex items-center gap-4 text-sm text-gray-600">
        {document.submittedBy && (
          <span>
            Uploaded from{" "}
            <Link
              href={`/users/${document.submittedBy.id}`}
              className="text-blue-600 hover:underline"
            >
              {document.submittedBy.name ||
                document.submittedBy.email ||
                "Unknown"}
            </Link>{" "}
            on {new Date(document.updatedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onToggleFullWidth && (
          <button
            onClick={onToggleFullWidth}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
            title={isFullWidth ? "Exit full width" : "Enter full width"}
          >
            {isFullWidth ? (
              <ArrowsPointingInIcon className="h-4 w-4" />
            ) : (
              <ArrowsPointingOutIcon className="h-4 w-4" />
            )}
            {isFullWidth ? "Exit Full Width" : "Full Width"}
          </button>
        )}
        <Link
          href={`/docs/${document.id}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
        >
          {showDetailedAnalysisLink ? "Detailed Analysis" : "Document Details"}
        </Link>
        {(document.importUrl || document.url) && (
          <Link
            href={document.importUrl || document.url}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            Source
          </Link>
        )}
        {/* Export dropdown */}
        <div 
          className="relative group"
          onMouseEnter={() => setDropdownOpen(true)}
          onMouseLeave={handleMouseLeave}
        >
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
            title="Export document"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export
          </button>
          <div className={`absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-10 transition-all duration-200 ${
            dropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
          }`}>
            {/* Mode toggle */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="flex p-1 bg-white rounded-lg border border-gray-200">
                <button
                  onClick={() => setExportMode('download')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    exportMode === 'download' 
                      ? 'bg-slate-700 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Save to file
                </button>
                <button
                  onClick={() => setExportMode('clipboard')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    exportMode === 'clipboard' 
                      ? 'bg-slate-700 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                  Copy to clipboard
                </button>
              </div>
            </div>
            {/* Export options */}
            <div className="py-2">
              {exportMode === 'download' ? (
                <>
                  <a
                    href={`/api/documents/${document.id}/export?format=md`}
                    download
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-xs font-bold">MD</span>
                    </div>
                    <span>Markdown</span>
                  </a>
                  <a
                    href={`/api/documents/${document.id}/export?format=yaml`}
                    download
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-xs font-bold">YML</span>
                    </div>
                    <span>YAML</span>
                  </a>
                  <a
                    href={`/api/documents/${document.id}/export?format=json`}
                    download
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                      <span className="text-orange-600 text-xs font-bold">JSON</span>
                    </div>
                    <span>JSON</span>
                  </a>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleExport('md')}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-bold">MD</span>
                      </div>
                      <span>Markdown</span>
                    </div>
                    {copiedFormat === 'md' && (
                      <CheckIcon className="h-5 w-5 text-green-600" />
                    )}
                  </button>
                  <button
                    onClick={() => handleExport('yaml')}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                        <span className="text-green-600 text-xs font-bold">YML</span>
                      </div>
                      <span>YAML</span>
                    </div>
                    {copiedFormat === 'yaml' && (
                      <CheckIcon className="h-5 w-5 text-green-600" />
                    )}
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                        <span className="text-orange-600 text-xs font-bold">JSON</span>
                      </div>
                      <span>JSON</span>
                    </div>
                    {copiedFormat === 'json' && (
                      <CheckIcon className="h-5 w-5 text-green-600" />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
