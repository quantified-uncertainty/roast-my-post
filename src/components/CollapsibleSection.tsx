"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface CollapsibleSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  action?: React.ReactNode;
}

export function CollapsibleSection({
  id,
  title,
  children,
  defaultOpen = true,
  action,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div id={id} className="mb-6 scroll-mt-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 py-4 px-6 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
        >
          {isOpen ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-gray-500" />
          )}
          <h4 className="text-lg font-medium text-gray-700">
            {title}
          </h4>
        </button>
        {action && (
          <div className="px-6">
            {action}
          </div>
        )}
      </div>
      
      {isOpen && (
        <div className="p-6">
          {children}
        </div>
      )}
    </div>
  );
}