import React from "react";

interface AgentBadgesProps {
  isDeprecated?: boolean;
  isRecommended?: boolean;
  isSystemManaged?: boolean;
  providesGrades?: boolean;
  size?: "sm" | "md";
}

export function AgentBadges({
  isDeprecated,
  isRecommended,
  isSystemManaged,
  providesGrades,
  size = "sm",
}: AgentBadgesProps) {
  const sizeClasses = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1 text-sm";

  return (
    <>
      {isDeprecated && (
        <div
          className={`inline-flex items-center rounded ${sizeClasses} bg-red-50 font-medium text-red-700`}
        >
          ⚠ Deprecated
        </div>
      )}
      {isRecommended && (
        <div
          className={`inline-flex items-center rounded ${sizeClasses} bg-yellow-50 font-medium text-yellow-700`}
        >
          ★ Recommended
        </div>
      )}
      {isSystemManaged ? (
        <div
          className={`inline-flex items-center rounded ${sizeClasses} bg-blue-50 font-medium text-blue-700`}
        >
          System
        </div>
      ) : (
        <div
          className={`inline-flex items-center rounded ${sizeClasses} bg-amber-50 font-medium text-amber-700`}
        >
          Custom
        </div>
      )}
      {providesGrades && (
        <div
          className={`inline-flex items-center rounded ${sizeClasses} bg-green-50 font-medium text-green-700`}
        >
          ✓ Grades
        </div>
      )}
    </>
  );
}
