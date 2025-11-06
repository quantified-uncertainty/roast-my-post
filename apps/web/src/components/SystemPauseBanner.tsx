"use client";

import { useEffect, useState } from "react";
import { getSystemPauseStatus } from "@/app/actions/system-pause-actions";
import type { ActivePause } from "@roast/db";

export function SystemPauseBanner() {
  const [activePause, setActivePause] = useState<ActivePause | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const pause = await getSystemPauseStatus();
        setActivePause(pause);
      } catch (error) {
        console.error("Failed to fetch system pause status:", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkStatus();

    // Poll every 30 seconds to check for status changes
    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  // Don't render anything while loading or if not paused
  if (isLoading || !activePause) {
    return null;
  }

  return (
    <div className="bg-red-600 text-white py-3 px-4 shadow-lg">
      <div className="container mx-auto max-w-7xl flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">
            API Access Temporarily Paused
          </h3>
          <p className="text-sm opacity-90">
            {activePause.reason}
          </p>
          <p className="text-xs opacity-75 mt-1">
            New evaluations and imports are temporarily disabled. Existing jobs will continue processing.
          </p>
        </div>
      </div>
    </div>
  );
}
