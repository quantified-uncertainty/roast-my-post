import React from "react";

export type EvaluationStatus = "pending" | "running" | "completed" | "failed" | "not_started";

interface StatusBadgeProps {
  status: EvaluationStatus;
  size?: "xs" | "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function StatusBadge({ 
  status, 
  size = "sm", 
  showText = true,
  className = "" 
}: StatusBadgeProps) {
  const sizeClasses = {
    xs: "text-xs px-1.5 py-0.5",
    sm: "text-sm px-2 py-0.5",
    md: "text-base px-2.5 py-1",
    lg: "text-lg px-3 py-1.5",
  };

  const statusConfig = {
    pending: {
      bgColor: "bg-blue-100",
      textColor: "text-blue-700",
      borderColor: "border-blue-200",
      icon: "⏳",
      text: "Pending",
      animation: "",
    },
    running: {
      bgColor: "bg-amber-100",
      textColor: "text-amber-700",
      borderColor: "border-amber-200",
      icon: "🔄",
      text: "Running",
      animation: "animate-pulse",
    },
    completed: {
      bgColor: "bg-green-100",
      textColor: "text-green-700",
      borderColor: "border-green-200",
      icon: "✓",
      text: "Completed",
      animation: "",
    },
    failed: {
      bgColor: "bg-red-100",
      textColor: "text-red-700",
      borderColor: "border-red-200",
      icon: "✗",
      text: "Failed",
      animation: "",
    },
    not_started: {
      bgColor: "bg-gray-100",
      textColor: "text-gray-600",
      borderColor: "border-gray-200",
      icon: "○",
      text: "Not Started",
      animation: "",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeClasses[size]} ${config.animation} ${className}
      `}
    >
      {status === "running" ? (
        <svg
          className="h-3 w-3 animate-spin"
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
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : (
        <span className="text-xs">{config.icon}</span>
      )}
      {showText && <span>{config.text}</span>}
    </span>
  );
}