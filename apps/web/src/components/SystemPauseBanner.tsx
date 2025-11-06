"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { getSystemPauseStatus } from "@/app/actions/system-pause-actions";
import { checkDocumentOwnership } from "@/app/actions/document-ownership-actions";
import type { ActivePause } from "@roast/db";

export function SystemPauseBanner() {
  const { data: session, status: sessionStatus } = useSession();
  const pathname = usePathname();
  const [activePause, setActivePause] = useState<ActivePause | null>(null);
  const [shouldShow, setShouldShow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        // Check if system is paused
        const pause = await getSystemPauseStatus();
        setActivePause(pause);

        // If not paused, no need to check further
        if (!pause) {
          setShouldShow(false);
          setIsLoading(false);
          return;
        }

        // If user not logged in, don't show
        if (sessionStatus !== "authenticated" || !session?.user?.id) {
          setShouldShow(false);
          setIsLoading(false);
          return;
        }

        // Check if on pages where pause is relevant
        if (pathname?.startsWith("/docs/new") || pathname?.startsWith("/docs/import")) {
          // Show on new document or import pages
          setShouldShow(true);
          setIsLoading(false);
          return;
        }

        // Check if on a document page the user owns
        const docIdMatch = pathname?.match(/^\/docs\/([^\/]+)/);
        if (docIdMatch && docIdMatch[1] !== "new" && docIdMatch[1] !== "import") {
          const docId = docIdMatch[1];
          const ownsDocument = await checkDocumentOwnership(docId);
          setShouldShow(ownsDocument);
          setIsLoading(false);
          return;
        }

        // Default: don't show
        setShouldShow(false);
      } catch (error) {
        console.error("Failed to fetch system pause status:", error);
        setShouldShow(false);
      } finally {
        setIsLoading(false);
      }
    }

    // Only check when session status is determined
    if (sessionStatus !== "loading") {
      checkStatus();
    }
  }, [pathname, session, sessionStatus]);

  // Don't render anything while loading, if shouldn't show, or if not paused
  if (isLoading || !shouldShow || !activePause) {
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
