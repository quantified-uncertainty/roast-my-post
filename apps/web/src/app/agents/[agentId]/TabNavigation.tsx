"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BarChart3, 
  Clock, 
  FileDown, 
  FileText, 
  Play, 
  User 
} from "lucide-react";

interface TabNavigationProps {
  agentId: string;
  isOwner: boolean;
  isAdmin: boolean;
}

export function TabNavigation({ agentId, isOwner, isAdmin }: TabNavigationProps) {
  const pathname = usePathname();
  const basePath = `/agents/${agentId}`;
  
  // Helper to determine if a tab is active
  const isActive = (path: string) => {
    if (path === "") {
      // Overview tab is active only on exact base path
      return pathname === basePath;
    }
    return pathname === `${basePath}${path}`;
  };

  const tabClass = (path: string) => {
    const active = isActive(path);
    return `inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
      active
        ? "border-blue-500 text-blue-600"
        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
    }`;
  };

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        <Link href={basePath} className={tabClass("")}>
          <User className="mr-2 h-5 w-5" />
          Overview
        </Link>
        <Link href={`${basePath}/details`} className={tabClass("/details")}>
          <FileText className="mr-2 h-5 w-5" />
          Details
        </Link>
        <Link href={`${basePath}/evals`} className={tabClass("/evals")}>
          <BarChart3 className="mr-2 h-5 w-5" />
          Evals
        </Link>
        {(isOwner || isAdmin) && (
          <>
            <Link href={`${basePath}/jobs`} className={tabClass("/jobs")}>
              <Clock className="mr-2 h-5 w-5" />
              Jobs
            </Link>
            <Link href={`${basePath}/export`} className={tabClass("/export")}>
              <FileDown className="mr-2 h-5 w-5" />
              Export
            </Link>
          </>
        )}
        {isOwner && (
          <>
            <Link href={`${basePath}/test`} className={tabClass("/test")}>
              <Play className="mr-2 h-5 w-5" />
              Test
            </Link>
            <Link href={`${basePath}/batches`} className={tabClass("/batches")}>
              <BarChart3 className="mr-2 h-5 w-5" />
              Batch Tests
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}