"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, FileDown } from "lucide-react";

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
      
      {/* Link to export page */}
      <Link href={`/docs/${documentId}/export`}>
        <Button
          variant="outline"
          size="sm"
          title="Export document"
        >
          <FileDown className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </Link>
    </div>
  );
}