"use client";

import Link from "next/link";
import { useState, useCallback } from "react";

import { PrivacyBadge } from "@/components/PrivacyBadge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ROUTES } from "@/constants/routes";
import type { Document } from "@/shared/types/databaseTypes";
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  CheckIcon,
} from "@heroicons/react/20/solid";
import { ExternalLink, Download, Copy, BarChart3 } from "lucide-react";

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
  const [exportMode, setExportMode] = useState<"download" | "clipboard">(
    "download"
  );
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

  // Reset to download mode when dropdown closes
  const handleMouseLeave = useCallback(() => {
    setDropdownOpen(false);
    // Reset state after a small delay to allow for smooth transition
    setTimeout(() => {
      setExportMode("download");
      setCopiedFormat(null);
    }, 200);
  }, []);
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex flex-col gap-1 text-sm text-gray-600">
        <div className="flex items-center gap-1.5 text-gray-600">
          <PrivacyBadge isPrivate={document.isPrivate} />
        </div>
        {document.submittedBy && (
          <div className="text-gray-600">
            <span>Uploaded by </span>
            <Link
              href={ROUTES.USERS.PROFILE(document.submittedBy.id)}
              className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              {document.submittedBy.name ||
                document.submittedBy.email ||
                "Unknown"}
            </Link>
            <span> on {new Date(document.updatedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
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
        <Button
          variant="outline"
          size="sm"
          asChild
          className="h-8 px-3 text-xs"
        >
          <Link href={`/docs/${document.id}`}>
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            {showDetailedAnalysisLink
              ? "Detailed Analysis"
              : "Document Details"}
          </Link>
        </Button>
        {(document.importUrl || document.url) && (
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 px-3 text-xs"
          >
            <Link
              href={document.importUrl || document.url || ""}
              target="_blank"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Source
            </Link>
          </Button>
        )}
        {/* Export dropdown */}
        <div
          className="group relative"
          onMouseEnter={() => setDropdownOpen(true)}
          onMouseLeave={handleMouseLeave}
        >
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            title="Export document"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
          <div
            className={`absolute right-0 z-10 mt-2 w-72 rounded-lg bg-white shadow-xl ring-1 ring-black ring-opacity-5 transition-all duration-200 ${
              dropdownOpen ? "visible opacity-100" : "invisible opacity-0"
            }`}
          >
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
                      <span className="text-xs font-bold text-blue-600">
                        MD
                      </span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
