import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface StaleBadgeProps {
  /**
   * Size variant of the badge
   */
  size?: "sm" | "md";
  /**
   * Optional custom class name
   */
  className?: string;
}

/**
 * A reusable badge component to indicate when an evaluation is stale
 * (doesn't match the current document version).
 */
export function StaleBadge({ size = "sm", className = "" }: StaleBadgeProps) {
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-0.5 text-sm",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
  };

  return (
    <div 
      className={`inline-flex items-center gap-1 bg-amber-100 text-amber-700 font-medium rounded ${sizeClasses[size]} ${className}`}
    >
      <ExclamationTriangleIcon className={iconSizes[size]} />
      STALE
    </div>
  );
}