import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  PlayIcon 
} from "@heroicons/react/24/outline";

export type JobStatus = "COMPLETED" | "FAILED" | "RUNNING" | "PENDING";

interface JobStatusBadgeProps {
  status: JobStatus | string;
  showIcon?: boolean;
}

export function JobStatusBadge({ status, showIcon = false }: JobStatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case "COMPLETED":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "FAILED":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "RUNNING":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "PENDING":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusIcon = (status: string) => {
    const iconClasses = "h-4 w-4 mr-1";
    switch (status) {
      case "COMPLETED":
        return <CheckCircleIcon className={`${iconClasses} text-green-600`} />;
      case "FAILED":
        return <XCircleIcon className={`${iconClasses} text-red-600`} />;
      case "RUNNING":
        return <PlayIcon className={`${iconClasses} text-blue-600 animate-pulse`} />;
      case "PENDING":
        return <ClockIcon className={`${iconClasses} text-yellow-600`} />;
      default:
        return <ClockIcon className={`${iconClasses} text-gray-600`} />;
    }
  };

  return (
    <span className={getStatusStyles(status)}>
      {showIcon && getStatusIcon(status)}
      {status.toLowerCase()}
    </span>
  );
}

export function JobStatusIcon({ status }: { status: JobStatus | string }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case "FAILED":
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      case "RUNNING":
        return <PlayIcon className="h-5 w-5 text-blue-600 animate-pulse" />;
      case "PENDING":
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  return getStatusIcon(status);
}