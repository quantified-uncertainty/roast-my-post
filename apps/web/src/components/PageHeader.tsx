import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  layout?: 'default' | 'with-sidebar';
}

export function PageHeader({ title, subtitle, children, layout = 'default' }: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {layout === 'with-sidebar' ? (
          <div className="flex gap-8">
            <div className="flex-1 max-w-4xl">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-sm text-gray-600 mt-1">
                      {subtitle}
                    </p>
                  )}
                </div>
                {children && (
                  <div className="ml-4">
                    {children}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {children && (
              <div className="ml-4">
                {children}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}