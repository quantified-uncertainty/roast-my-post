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
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };

  const labelSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  if (status === "PENDING") {
    return (
      <div className="group relative flex items-center gap-2">
        <div className="relative">
          <div className={`${sizeClasses[size]} rounded-full bg-yellow-400`} />
          <div className="invisible group-hover:visible absolute z-10 -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs text-white bg-gray-900 rounded whitespace-nowrap">
            Queued
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
          </div>
        </div>
        {showLabel && (
          <span className={`${labelSizeClasses[size]} text-yellow-600 font-medium`}>
            Queued
          </span>
        )}
      </div>
    );
  }

  if (status === "RUNNING") {
    return (
      <div className="group relative flex items-center gap-2">
        <div className="relative">
          <div className={`${sizeClasses[size]} rounded-full bg-blue-400`} />
          <div className="invisible group-hover:visible absolute z-10 -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs text-white bg-gray-900 rounded whitespace-nowrap">
            Running
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
          </div>
        </div>
        {showLabel && (
          <span className={`${labelSizeClasses[size]} text-blue-600 font-medium`}>
            Running
          </span>
        )}
      </div>
    );
  }

  if (status === "FAILED") {
    return (
      <div className="group relative flex items-center gap-2">
        <div className="relative">
          <div className={`${sizeClasses[size]} rounded-full bg-red-500`} />
          <div className="invisible group-hover:visible absolute z-10 -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs text-white bg-gray-900 rounded whitespace-nowrap">
            Failed
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
          </div>
        </div>
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