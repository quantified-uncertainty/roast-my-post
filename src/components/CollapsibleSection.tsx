"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface CollapsibleSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({
  id,
  title,
  children,
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div id={id} className="mb-6 scroll-mt-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2 border-b border-gray-200 flex items-center gap-2 hover:bg-gray-50 transition-colors -mx-2 px-2 rounded"
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
      
      {isOpen && (
        <div className="pt-4">
          {children}
        </div>
      )}
    </div>
  );
}