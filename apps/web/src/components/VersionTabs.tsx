"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/utils";

interface VersionTabsProps {
  docId: string;
  agentId: string;
  versionNumber: number;
}

export function VersionTabs({ docId, agentId, versionNumber }: VersionTabsProps) {
  const pathname = usePathname();
  const isLogsTab = pathname.endsWith('/logs');
  
  const tabs = [
    {
      name: 'Contents',
      href: `/docs/${docId}/evals/${agentId}/versions/${versionNumber}`,
      active: !isLogsTab,
    },
    {
      name: 'Job Details',
      href: `/docs/${docId}/evals/${agentId}/versions/${versionNumber}/logs`,
      active: isLogsTab,
    },
  ];

  return (
    <div className="border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      </div>
    </div>
  );
}