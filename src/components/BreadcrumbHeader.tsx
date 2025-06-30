"use client";

import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbHeaderProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbHeader({ items }: BreadcrumbHeaderProps) {
  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center space-x-2 py-3 text-sm">
          {items.map((item, index) => (
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