import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  PlayIcon 
} from "@heroicons/react/24/outline";

export type JobStatus = "COMPLETED" | "FAILED" | "RUNNING" | "PENDING";

export function getStatusIcon(status: string, size: 'sm' | 'md' = 'md') {
  const iconClasses = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  
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
}

export function getStatusStyles(status: string) {
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
}