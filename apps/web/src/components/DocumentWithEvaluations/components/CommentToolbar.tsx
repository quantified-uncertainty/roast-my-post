"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@heroicons/react/20/solid";
import { Maximize2, Minimize2, Download, Copy } from "lucide-react";

interface CommentToolbarProps {
  documentId: string;
  isFullWidth: boolean;
  onToggleFullWidth: () => void;
}

export function CommentToolbar({
  documentId,
  isFullWidth,
  onToggleFullWidth,
}: CommentToolbarProps) {
  const [exportMode, setExportMode] = useState<'download' | 'clipboard'>('download');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleExport = useCallback(async (format: string) => {
    if (exportMode === 'clipboard') {
      try {
        const response = await fetch(`/api/documents/${documentId}/export?format=${format}`);
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
      window.location.href = `/api/documents/${documentId}/export?format=${format}`;
    }
  }, [documentId, exportMode]);

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
    <div className="flex items-center justify-end gap-2 mb-4">
      <Button
        onClick={onToggleFullWidth}
        variant="outline"
        size="sm"
        title={isFullWidth ? "Exit full width" : "Enter full width"}
      >
        {isFullWidth ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">
          {isFullWidth ? "Exit Full Width" : "Full Width"}
        </span>
      </Button>
      
      {/* Export dropdown */}
      <div 
        className="relative group"
        onMouseEnter={() => setDropdownOpen(true)}
        onMouseLeave={handleMouseLeave}
      >
        <Button
          variant="outline"
          size="sm"
          title="Export document"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
        <div className={`absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-50 transition-all duration-200 ${
          dropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}>
          {/* Mode toggle */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex p-1 bg-white rounded-lg border border-gray-200">
              <Button
                onClick={() => setExportMode('download')}
                variant={exportMode === 'download' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 justify-start"
              >
                <Download className="h-4 w-4" />
                Save to file
              </Button>
              <Button
                onClick={() => setExportMode('clipboard')}
                variant={exportMode === 'clipboard' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 justify-start"
              >
                <Copy className="h-4 w-4" />
                Copy to clipboard
              </Button>
            </div>
          </div>
          {/* Export options */}
          <div className="py-2">
            {exportMode === 'download' ? (
              <>
                <a
                  href={`/api/documents/${documentId}/export?format=md`}
                  download
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-bold">MD</span>
                  </div>
                  <span>Markdown</span>
                </a>
                <a
                  href={`/api/documents/${documentId}/export?format=yaml`}
                  download
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">YML</span>
                  </div>
                  <span>YAML</span>
                </a>
                <a
                  href={`/api/documents/${documentId}/export?format=json`}
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
  );
}