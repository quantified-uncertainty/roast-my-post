'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BeakerIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface ExperimentalBadgeProps {
  trackingId?: string | null;
  className?: string;
  showIcon?: boolean;
}

export function ExperimentalBadge({ trackingId, className = '', showIcon = true }: ExperimentalBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 cursor-help ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {showIcon && <BeakerIcon className="h-3 w-3" />}
        <span>Experimental</span>
      </div>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-gray-900 text-white text-sm rounded-lg shadow-lg p-3 max-w-xs">
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Experimental Evaluation</p>
                <p className="text-xs text-gray-300 mb-2">
                  This evaluation was created as part of a temporary experiment. 
                  It will be automatically deleted when the experiment expires.
                </p>
                {trackingId && (
                  <Link
                    href={`/experiments/${trackingId}`}
                    className="text-xs text-purple-400 hover:text-purple-300 underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View experiment details →
                  </Link>
                )}
              </div>
            </div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}