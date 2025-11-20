'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import type { ToolConfig } from '@roast/ai';

interface ToolTabsProps {
  toolId: string;
  toolConfig: ToolConfig;
}

export function ToolTabs({ toolId, toolConfig }: ToolTabsProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const isAuthenticated = !!session?.user;
  
  const normalizedPath = pathname.replace(/\/+$/, ''); // Remove trailing slashes
  const isDocsPage = normalizedPath === `/tools/${toolId}/docs` || normalizedPath === `/tools/${toolId}`;
  const isTryPage = normalizedPath === `/tools/${toolId}/try`;

  // Check if tool requires auth and user is not authenticated
  const requiresAuth = toolConfig.requiresAuth !== false; // Default to true if not specified
  const isLocked = requiresAuth && !isAuthenticated && !isLoading;

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
          
          {isLocked ? (
            <div
              className="py-2 px-1 border-b-2 border-transparent font-medium text-sm opacity-50 cursor-not-allowed flex items-center gap-1.5 group relative"
              title="Sign in required to try this tool"
            >
              <LockClosedIcon className="h-4 w-4" />
              <span>Try It</span>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                Sign in required to try this tool
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          ) : (
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
          )}
        </nav>
      </div>
    </div>
  );
}

