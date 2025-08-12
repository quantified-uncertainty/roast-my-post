import React from 'react';

export interface StatItem {
  label: string;
  value: string | number;
  color?: 'gray' | 'green' | 'red' | 'yellow' | 'blue' | 'purple';
  description?: string;
}

interface StatsSummaryProps {
  stats: StatItem[];
  title?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
  size?: 'small' | 'medium' | 'large';
}

const colorMap = {
  gray: 'bg-gray-50 text-gray-900',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
} as const;

const sizeMap = {
  small: {
    valueClass: 'text-xl',
    labelClass: 'text-xs',
    paddingClass: 'p-2'
  },
  medium: {
    valueClass: 'text-2xl',
    labelClass: 'text-sm',
    paddingClass: 'p-3'
  },
  large: {
    valueClass: 'text-3xl',
    labelClass: 'text-base',
    paddingClass: 'p-4'
  }
} as const;

/**
 * Reusable component for displaying statistics summary
 * Used across multiple tools for showing counts, metrics, etc.
 */
export function StatsSummary({
  stats,
  title,
  columns = 4,
  size = 'medium'
}: StatsSummaryProps) {
  const gridClass = `grid grid-cols-${columns} gap-3`;
  const { valueClass, labelClass, paddingClass } = sizeMap[size];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {title && (
        <h2 className="text-lg font-medium text-gray-900 mb-4">{title}</h2>
      )}
      
      <div className={gridClass}>
        {stats.map((stat, index) => {
          const colorClass = colorMap[stat.color || 'gray'];
          
          return (
            <div 
              key={index}
              className={`text-center ${paddingClass} ${colorClass} rounded`}
              title={stat.description}
            >
              <p className={`${valueClass} font-bold`}>
                {stat.value}
              </p>
              <p className={`${labelClass} text-gray-600 mt-1`}>
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}