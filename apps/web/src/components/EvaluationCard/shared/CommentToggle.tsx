"use client";

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
      <input
        type="checkbox"
        checked={isActive}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className={`relative inline-block h-4 w-9 rounded-full transition-colors duration-200 ${
          isActive ? "bg-purple-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-2 w-2 rounded-full bg-white shadow transition-transform duration-200 ${
            isActive ? "translate-x-4" : ""
          }`}
        />
      </span>
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