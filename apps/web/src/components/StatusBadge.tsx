import React from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

import { STATUS_COLORS } from "@/shared/constants/statusColors";

export type EvaluationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "not_started";

interface StatusBadgeProps {
  status: EvaluationStatus;
  showText?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  showText = true,
  className = "",
}: StatusBadgeProps) {
  const sizeClasses = "text-xs px-1.5 py-0.5";

  const statusConfig = {
    pending: {
      bgColor: STATUS_COLORS.pending.bg,
      textColor: STATUS_COLORS.pending.text,
      borderColor: STATUS_COLORS.pending.border,
      icon: "",
      text: "Pending",
      animation: "",
    },
    running: {
      bgColor: STATUS_COLORS.running.bg,
      textColor: STATUS_COLORS.running.text,
      borderColor: STATUS_COLORS.running.border,
      icon: "",
      text: "Running",
      animation: "animate-pulse",
    },
    completed: {
      bgColor: STATUS_COLORS.completed.bg,
      textColor: STATUS_COLORS.completed.text,
      borderColor: STATUS_COLORS.completed.border,
      icon: "✓",
      text: "Completed",
      animation: "",
    },
    failed: {
      bgColor: STATUS_COLORS.failed.bg,
      textColor: STATUS_COLORS.failed.text,
      borderColor: STATUS_COLORS.failed.border,
      icon: "✗",
      text: "Failed",
      animation: "",
    },
    not_started: {
      bgColor: STATUS_COLORS.not_started.bg,
      textColor: STATUS_COLORS.not_started.text,
      borderColor: STATUS_COLORS.not_started.border,
      icon: "",
      text: "Not Started",
      animation: "",
    },
  };

  const config = statusConfig[status];

  // Icon rendering logic
  const renderIcon = () => {
    if (status === "running") {
      return <ArrowPathIcon className="h-3 w-3 animate-spin" />;
    }
    if (config.icon) {
      return <span className="text-xs">{config.icon}</span>;
    }
    return null;
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeClasses} ${config.animation} ${className} `}
    >
      {renderIcon()}
      {showText && <span>{config.text}</span>}
    </span>
  );
}
