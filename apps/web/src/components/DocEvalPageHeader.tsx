"use client";

import { BookOpenIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { rerunEvaluation } from "@/app/docs/[docId]/actions/evaluation-actions";

interface DocEvalPageHeaderProps {
  title: string;
  docId: string;
  agentId: string;
  layout?: "default" | "with-sidebar";
  showRerunButton?: boolean;
  showReaderButton?: boolean;
  isOwner?: boolean;
}

export function DocEvalPageHeader({
  title,
  docId,
  agentId,
  layout = "with-sidebar",
  showRerunButton = true,
  showReaderButton = true,
  isOwner = false,
}: DocEvalPageHeaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTriggered, setIsTriggered] = useState(false);
  const router = useRouter();

  const handleRerun = async () => {
    setIsLoading(true);
    try {
      const result = await rerunEvaluation(agentId, docId);
      if (result.success) {
        setIsTriggered(true);
        // Refresh the page after a short delay
        setTimeout(() => {
          router.refresh();
          setIsTriggered(false);
        }, 1500);
      } else {
        console.error("Failed to trigger rerun:", result.error);
      }
    } catch (error) {
      console.error("Error triggering rerun:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageHeader title={title} layout={layout}>
      <div className="flex items-center gap-2">
        {showRerunButton && isOwner && (
          <Button
            variant="outline"
            onClick={handleRerun}
            disabled={isLoading || isTriggered}
            title="Re-run this evaluation"
          >
            <RefreshCwIcon className="h-4 w-4" />
            {isTriggered ? "Triggered" : isLoading ? "Loading..." : "Rerun"}
          </Button>
        )}
        {showReaderButton && (
          <Button asChild>
            <Link href={`/docs/${docId}/reader?evals=${agentId}`}>
              <BookOpenIcon className="h-4 w-4" />
              Open in Reader
            </Link>
          </Button>
        )}
      </div>
    </PageHeader>
  );
}