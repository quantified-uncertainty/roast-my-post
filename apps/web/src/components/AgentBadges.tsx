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
  size = "sm"
}: AgentBadgesProps) {
  const sizeClasses = size === "sm"
    ? "px-2 py-1 text-xs"
    : "px-3 py-1 text-sm";

  return (
    <>
      {isDeprecated && (
        <div className={`inline-flex items-center rounded ${sizeClasses} font-medium bg-red-50 text-red-700`}>
          ⚠ Deprecated
        </div>
      )}
      {isRecommended && (
        <div className={`inline-flex items-center rounded ${sizeClasses} font-medium bg-yellow-50 text-yellow-700`}>
          ★ Recommended
        </div>
      )}
      {isSystemManaged && (
        <div className={`inline-flex items-center rounded ${sizeClasses} font-medium bg-blue-50 text-blue-700`}>
          System
        </div>
      )}
      {providesGrades && (
        <div className={`inline-flex items-center rounded ${sizeClasses} font-medium bg-green-50 text-green-700`}>
          ✓ Grades
        </div>
      )}
    </>
  );
}