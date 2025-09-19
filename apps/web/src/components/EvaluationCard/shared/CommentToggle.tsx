"use client";

import { Checkbox } from "@/components/ui/checkbox";

interface CommentToggleProps {
  isActive: boolean;
  commentCount: number;
  onChange: () => void;
}

/**
 * Shared toggle switch component for showing/hiding evaluation comments
 */
export function CommentToggle({ isActive, commentCount, onChange }: CommentToggleProps) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2">
      <Checkbox
        checked={isActive}
        onCheckedChange={onChange}
        className="h-4 w-4"
      />
      <span
        className={`text-sm font-medium ${
          isActive ? "text-gray-700" : "text-gray-400"
        }`}
      >
        Comments ({commentCount})
      </span>
    </label>
  );
}