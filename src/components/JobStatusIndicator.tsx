import React from "react";

interface JobStatusIndicatorProps {
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function JobStatusIndicator({ 
  status, 
  size = "sm", 
  showLabel = false 
}: JobStatusIndicatorProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  const labelSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  if (status === "PENDING" || status === "RUNNING") {
    return (
      <div className="flex items-center gap-2">
        <svg 
          className={`animate-spin ${sizeClasses[size]} ${
            status === "PENDING" ? "text-yellow-500" : "text-blue-500"
          }`} 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {showLabel && (
          <span className={`${labelSizeClasses[size]} ${
            status === "PENDING" ? "text-yellow-600" : "text-blue-600"
          } font-medium`}>
            {status === "PENDING" ? "Queued" : "Running"}
          </span>
        )}
      </div>
    );
  }

  if (status === "FAILED") {
    return (
      <div className="flex items-center gap-2">
        <svg 
          className={`${sizeClasses[size]} text-red-500`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        {showLabel && (
          <span className={`${labelSizeClasses[size]} text-red-600 font-medium`}>
            Failed
          </span>
        )}
      </div>
    );
  }

  // COMPLETED status - don't show indicator by default
  return null;
}