'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface ToolTabsProps {
  toolId: string;
}

export function ToolTabs({ toolId }: ToolTabsProps) {
  const pathname = usePathname();
  const normalizedPath = pathname.replace(/\/+$/, ''); // Remove trailing slashes
  const isDocsPage = normalizedPath === `/tools/${toolId}/docs` || normalizedPath === `/tools/${toolId}`;
  const isTryPage = normalizedPath === `/tools/${toolId}/try`;

  return (
    <div className="mb-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <Link
            href={`/tools/${toolId}/docs`}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              isDocsPage
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Documentation
          </Link>
          <Link
            href={`/tools/${toolId}/try`}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              isTryPage
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Try It
          </Link>
        </nav>
      </div>
    </div>
  );
}

