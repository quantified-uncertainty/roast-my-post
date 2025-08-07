"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/utils";

interface EvaluationTabsProps {
  docId: string;
  agentId: string;
  latestVersionNumber?: number;
}

export function EvaluationTabs({ docId, agentId, latestVersionNumber = 1 }: EvaluationTabsProps) {
  const pathname = usePathname();
  const isLogsTab = pathname.endsWith('/logs');
  const isVersionsTab = pathname.includes('/versions/');
  
  const tabs = [
    {
      name: 'Contents',
      href: `/docs/${docId}/evals/${agentId}`,
      active: !isLogsTab && !isVersionsTab,
    },
    {
      name: 'Job Details',
      href: `/docs/${docId}/evals/${agentId}/logs`,
      active: isLogsTab && !isVersionsTab,
    },
    {
      name: 'Versions',
      href: `/docs/${docId}/evals/${agentId}/versions/${latestVersionNumber}`,
      active: isVersionsTab,
    },
  ];

  return (
    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
      {tabs.map((tab) => (
        <Link
          key={tab.name}
          href={tab.href}
          className={cn(
            tab.active
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
          )}
        >
          {tab.name}
        </Link>
      ))}
    </nav>
  );
}