'use client';

import { useState, ReactNode } from 'react';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface TabbedToolPageLayoutProps {
  title: string;
  description: string;
  icon: ReactNode;
  warning?: string;
  tryContent: ReactNode;
  docsContent: ReactNode;
}

export function TabbedToolPageLayout({
  title,
  description,
  icon,
  warning,
  tryContent,
  docsContent,
}: TabbedToolPageLayoutProps) {
  const [activeTab, setActiveTab] = useState<'try' | 'docs'>('try');

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/tools" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <ChevronLeftIcon className="h-4 w-4 mr-1" />
        Back to Tools
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {icon}
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        </div>
        <p className="text-gray-600">{description}</p>
        {warning && (
          <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-400">
            <p className="text-sm text-amber-700">{warning}</p>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('try')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'try'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Try
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'docs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Documentation
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'try' && <div className="try-tab">{tryContent}</div>}
        {activeTab === 'docs' && <div className="docs-tab">{docsContent}</div>}
      </div>
    </div>
  );
}