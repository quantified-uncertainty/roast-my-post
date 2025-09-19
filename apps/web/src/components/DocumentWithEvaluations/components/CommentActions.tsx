"use client";

import { useState, useCallback } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Document } from "@/shared/types/databaseTypes";
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  CheckIcon,
} from "@heroicons/react/20/solid";
import { Download, Copy } from "lucide-react";

interface CommentActionsProps {
  document: Document;
  isFullWidth?: boolean;
  onToggleFullWidth?: () => void;
}

export function CommentActions({
  document,
  isFullWidth = false,
  onToggleFullWidth,
}: CommentActionsProps) {
  const [exportMode, setExportMode] = useState<"download" | "clipboard">(
    "download"
  );
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const handleExport = useCallback(
    async (format: string) => {
      if (exportMode === "clipboard") {
        try {
          const response = await fetch(
            `/api/documents/${document.id}/export?format=${format}`
          );
          const text = await response.text();
          await navigator.clipboard.writeText(text);

          // Show success feedback
          setCopiedFormat(format);
          setTimeout(() => setCopiedFormat(null), 2000);
        } catch (error) {
          console.error("Failed to copy to clipboard:", error);
        }
      } else {
        // Download mode - use existing anchor tag behavior
        window.location.href = `/api/documents/${document.id}/export?format=${format}`;
      }
    },
    [document.id, exportMode]
  );

  return (
    <div className="flex items-center gap-2">
      {onToggleFullWidth && (
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFullWidth}
          className="h-8 px-3 text-xs"
          title={isFullWidth ? "Exit full width" : "Enter full width"}
        >
          {isFullWidth ? (
            <ArrowsPointingInIcon className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <ArrowsPointingOutIcon className="mr-1.5 h-3.5 w-3.5" />
          )}
          {isFullWidth ? "Exit Full Width" : "Full Width"}
        </Button>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            title="Export document"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-0">
          {/* Mode toggle */}
          <div className="border-b border-gray-200 bg-gray-50 p-3">
            <ToggleGroup
              type="single"
              value={exportMode}
              onValueChange={(value) =>
                setExportMode(value as "download" | "clipboard")
              }
              className="grid w-full grid-cols-2 gap-1"
            >
              <ToggleGroupItem
                value="download"
                size="sm"
                className="h-9 text-sm font-medium data-[state=off]:bg-white data-[state=on]:bg-blue-600 data-[state=off]:text-gray-700 data-[state=on]:text-white data-[state=on]:shadow-sm data-[state=off]:hover:bg-gray-50"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </ToggleGroupItem>
              <ToggleGroupItem
                value="clipboard"
                size="sm"
                className="h-9 text-sm font-medium data-[state=off]:bg-white data-[state=on]:bg-blue-600 data-[state=off]:text-gray-700 data-[state=on]:text-white data-[state=on]:shadow-sm data-[state=off]:hover:bg-gray-50"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          {/* Export options */}
          <div className="py-2">
            {exportMode === "download" ? (
              <>
                <a
                  href={`/api/documents/${document.id}/export?format=md`}
                  download
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                    <span className="text-xs font-bold text-blue-600">MD</span>
                  </div>
                  <span>Markdown</span>
                </a>
                <a
                  href={`/api/documents/${document.id}/export?format=yaml`}
                  download
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                    <span className="text-xs font-bold text-green-600">
                      YML
                    </span>
                  </div>
                  <span>YAML</span>
                </a>
                <a
                  href={`/api/documents/${document.id}/export?format=json`}
                  download
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
                    <span className="text-xs font-bold text-orange-600">
                      JSON
                    </span>
                  </div>
                  <span>JSON</span>
                </a>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => handleExport("md")}
                  className="h-10 w-full justify-between px-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50">
                      <span className="text-xs font-bold text-blue-600">
                        MD
                      </span>
                    </div>
                    <span>Markdown</span>
                  </div>
                  {copiedFormat === "md" && (
                    <CheckIcon className="h-4 w-4 text-green-600" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleExport("yaml")}
                  className="h-10 w-full justify-between px-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-50">
                      <span className="text-xs font-bold text-green-600">
                        YML
                      </span>
                    </div>
                    <span>YAML</span>
                  </div>
                  {copiedFormat === "yaml" && (
                    <CheckIcon className="h-4 w-4 text-green-600" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleExport("json")}
                  className="h-10 w-full justify-between px-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-50">
                      <span className="text-xs font-bold text-orange-600">
                        JSON
                      </span>
                    </div>
                    <span>JSON</span>
                  </div>
                  {copiedFormat === "json" && (
                    <CheckIcon className="h-4 w-4 text-green-600" />
                  )}
                </Button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
