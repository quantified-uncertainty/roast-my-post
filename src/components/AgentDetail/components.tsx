import {
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

import {
  getStatusBadgeClass,
  getStatusIconType,
} from "./utils";

export const StatusBadge = ({ status }: { status?: string }) => {
  if (!status) return null;

  const className = getStatusBadgeClass(status);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {status}
    </span>
  );
};

export const StatusIcon = ({ status }: { status: string }) => {
  const iconType = getStatusIconType(status);

  switch (iconType) {
    case "check-circle":
      return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
    case "x-circle":
      return <XCircleIcon className="h-5 w-5 text-red-600" />;
    case "play":
      return <PlayIcon className="h-5 w-5 animate-pulse text-blue-600" />;
    case "clock":
      return <ClockIcon className="h-5 w-5 text-yellow-600" />;
    default:
      return <ClockIcon className="h-5 w-5 text-gray-600" />;
  }
};
