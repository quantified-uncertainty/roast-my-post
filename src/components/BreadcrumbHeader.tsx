"use client";

import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbHeaderProps {
  documentTitle: string;
  agentName?: string;
  versionNumber?: number;
  isLogsPage?: boolean;
}

export function BreadcrumbHeader({ 
  documentTitle, 
  agentName,
  versionNumber,
  isLogsPage 
}: BreadcrumbHeaderProps) {
  const pathname = usePathname();
  
  // Build breadcrumb items based on current path
  const breadcrumbs: BreadcrumbItem[] = [
    { label: documentTitle, href: pathname.includes('/evals/') ? pathname.split('/evals/')[0] : undefined }
  ];

  if (agentName) {
    breadcrumbs.push({ 
      label: agentName, 
      href: versionNumber ? pathname.split('/versions/')[0] : undefined 
    });
  }

  if (versionNumber) {
    const versionLabel = isLogsPage ? `V${versionNumber}` : `V${versionNumber}`;
    const versionHref = isLogsPage ? pathname.replace('/logs', '') : undefined;
    breadcrumbs.push({ 
      label: versionLabel,
      href: versionHref
    });
    
    if (isLogsPage) {
      breadcrumbs.push({ label: 'Logs' });
    }
  }

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center space-x-2 py-3 text-sm">
          {breadcrumbs.map((item, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2 flex-shrink-0" />
              )}
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-gray-600 hover:text-gray-900 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-900 font-medium">{item.label}</span>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}