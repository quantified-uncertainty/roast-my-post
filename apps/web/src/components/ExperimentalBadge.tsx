'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { BeakerIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface ExperimentalBadgeProps {
  trackingId?: string | null;
  className?: string;
  showIcon?: boolean;
}

export function ExperimentalBadge({ trackingId, className = '', showIcon = true }: ExperimentalBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const badgeRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (showTooltip && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top + rect.height / 2, // Center vertically
        left: rect.right + 10, // 10px to the right of the badge
      });
    }
  }, [showTooltip]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 300); // 300ms delay before hiding
  };

  const tooltipContent = showTooltip && mounted && (
    <div 
      className="fixed z-[9999] pointer-events-none"
      style={{
        top: `${tooltipPosition.top}px`,
        left: `${tooltipPosition.left}px`,
        transform: 'translateY(-50%)',
      }}
    >
      <div 
        className="bg-gray-900 text-white text-sm rounded-lg shadow-lg p-3 w-64 pointer-events-auto relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
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
        <div className="absolute top-1/2 left-0 transform -translate-x-full -translate-y-1/2">
          <div className="w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="inline-flex items-center" ref={badgeRef}>
        <div
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 cursor-help ${className}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {showIcon && <BeakerIcon className="h-3 w-3" />}
          <span>Experimental</span>
        </div>
      </div>
      {mounted && typeof document !== 'undefined' && createPortal(tooltipContent, document.body)}
    </>
  );
}