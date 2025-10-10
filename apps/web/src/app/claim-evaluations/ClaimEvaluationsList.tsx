"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import { useDebounce } from "@/hooks/useDebounce";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface ClaimEvaluation {
  id: string;
  claim: string;
  summaryMean: number | null;
  createdAt: string;
  context?: string | null;
  rawOutput?: {
    evaluations?: Array<{
      hasError: boolean;
      successfulResponse?: {
        agreement: number;
      };
    }>;
  };
}

interface FetchResponse {
  data: ClaimEvaluation[];
  nextCursor: string | null;
  hasMore: boolean;
}

const ITEM_HEIGHT = 40; // Height of each list item in pixels (single line)
const BUFFER_SIZE = 5; // Extra items to render above/below viewport

export function ClaimEvaluationsList() {
  const [items, setItems] = useState<ClaimEvaluation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "agreement">("date");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Client-side filtering for instant feedback on loaded items
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.claim.toLowerCase().includes(query) ||
        item.context?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  // Calculate visible range for virtual scrolling
  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    const totalHeight = filteredItems.length * ITEM_HEIGHT;
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE
    );
    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT);
    const endIndex = Math.min(
      filteredItems.length,
      startIndex + visibleCount + BUFFER_SIZE * 2
    );
    const offsetY = startIndex * ITEM_HEIGHT;

    return { startIndex, endIndex, totalHeight, offsetY };
  }, [filteredItems.length, scrollTop, containerHeight]);

  const visibleItems = filteredItems.slice(startIndex, endIndex);

  // Reset and fetch when search or sort changes
  useEffect(() => {
    const abortController = new AbortController();
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setItems([]);
      setNextCursor(null);
      setHasMore(true);
      setScrollTop(0); // Reset scroll position when dataset changes

      // Also reset the actual scroll position in the DOM
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }

      try {
        const params = new URLSearchParams({
          limit: "50",
          sortBy,
          order: "desc",
        });

        if (debouncedSearch) {
          params.set("search", debouncedSearch);
        }

        const response = await fetch(`/api/claim-evaluations?${params}`, {
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error("Failed to fetch evaluations");
        }

        const data: FetchResponse = await response.json();

        if (!cancelled) {
          setItems(data.data);
          setNextCursor(data.nextCursor);
          setHasMore(data.hasMore);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [debouncedSearch, sortBy]);

  // Fetch more data for infinite scroll
  const fetchMore = useCallback(async () => {
    if (loading || !hasMore || !nextCursor) return;

    setLoading(true);

    try {
      const params = new URLSearchParams({
        limit: "50",
        sortBy,
        order: "desc",
        cursor: nextCursor,
      });

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const response = await fetch(`/api/claim-evaluations?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch evaluations");
      }

      const data: FetchResponse = await response.json();

      setItems((prev) => [...prev, ...data.data]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, nextCursor, sortBy, debouncedSearch]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setScrollTop(container.scrollTop);

    const scrolledToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      200;

    if (scrolledToBottom && hasMore && !loading) {
      fetchMore();
    }
  }, [hasMore, loading, fetchMore]);

  // Measure container height
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search claims..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "date" | "agreement")}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="date">Latest</option>
            <option value="agreement">Agreement</option>
          </select>
        </div>
      </div>

      {/* Virtual scrolling container - 2 column grid */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="overflow-y-auto bg-white"
        style={{ height: "600px" }}
      >
        <div style={{ height: `${totalHeight}px`, position: "relative" }}>
          <div
            style={{ transform: `translateY(${offsetY}px)` }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          >
            {visibleItems.map((item) => (
              <ClaimCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        {loading && (
          <div className="border-t border-gray-200 p-4 text-center text-sm text-gray-500">
            Loading...
          </div>
        )}

        {error && (
          <div className="border-t border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? "No claims match your search" : "No evaluations yet"}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-500">
        Showing {filteredItems.length} claim
        {filteredItems.length !== 1 ? "s" : ""}
        {searchQuery && items.length !== filteredItems.length && (
          <span> (filtered from {items.length})</span>
        )}
      </div>
    </div>
  );
}

function ClaimCard({ item }: { item: ClaimEvaluation }) {
  // summaryMean is already 0-100, no need to multiply by 100
  const agreementPercent = item.summaryMean !== null && item.summaryMean !== undefined
    ? Math.round(item.summaryMean)
    : null;

  const agreementColor =
    agreementPercent === null
      ? "text-gray-400"
      : agreementPercent >= 70
        ? "text-green-600"
        : agreementPercent <= 30
          ? "text-red-600"
          : "text-yellow-600";

  // Helper to get color based on agreement score
  const getAgreementColor = (agreement: number): string => {
    if (agreement >= 70) return "#22c55e"; // green-500
    if (agreement >= 50) return "#eab308"; // yellow-500
    if (agreement >= 30) return "#f97316"; // orange-500
    return "#ef4444"; // red-500
  };

  // Sort evaluations: failed first, then by agreement (low to high)
  const sortedEvaluations = item.rawOutput?.evaluations
    ? [...item.rawOutput.evaluations].sort((a, b) => {
        // Failed items first
        if (a.hasError && !b.hasError) return -1;
        if (!a.hasError && b.hasError) return 1;

        // Both successful or both failed - sort by agreement (low to high)
        const aAgreement = a.successfulResponse?.agreement ?? 50;
        const bAgreement = b.successfulResponse?.agreement ?? 50;
        return aAgreement - bAgreement;
      })
    : [];

  return (
    <Link
      href={`/claim-evaluations/${item.id}`}
      className="block rounded-lg bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-100"
      style={{ height: `${ITEM_HEIGHT}px` }}
    >
      <div className="flex h-full items-center justify-between gap-4">
        {/* Claim text - clickable, truncated to single line */}
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium text-gray-900 hover:text-indigo-600">
            {item.claim}
          </p>
        </div>

        {/* Evaluation count and agreement */}
        <div className="flex flex-shrink-0 items-center gap-3">
          {/* Dot visualization for each evaluation */}
          {sortedEvaluations.length > 0 && (
            <div
              className="flex items-center gap-0.5 opacity-20 transition-opacity hover:opacity-100"
              style={
                sortedEvaluations.length > 5
                  ? {
                      // Multi-row layout: dots flow right-to-left, bottom-to-top
                      // This creates a compact grid where most recent evaluations
                      // appear in the bottom-right and wrap upward
                      flexWrap: "wrap-reverse",
                      flexDirection: "row-reverse",
                      maxWidth: "60px", // Approximately 5 dots per row
                    }
                  : undefined
              }
            >
              {/* For multi-row layouts, reverse array so most recent is bottom-right */}
              {(sortedEvaluations.length > 5
                ? [...sortedEvaluations].reverse()
                : sortedEvaluations
              ).map((evaluation, idx) => (
                <div
                  key={idx}
                  className="h-2 w-2 rounded-sm"
                  style={{
                    backgroundColor: evaluation.hasError
                      ? "#9ca3af" // gray-400 for errors
                      : getAgreementColor(
                          evaluation.successfulResponse?.agreement ?? 50
                        ),
                  }}
                  title={
                    evaluation.hasError
                      ? "Failed"
                      : `${evaluation.successfulResponse?.agreement}% agreement`
                  }
                />
              ))}
            </div>
          )}

          <div className={`text-sm font-bold ${agreementColor} w-6 text-right`}>
            {agreementPercent !== null ? agreementPercent : ""}
          </div>
        </div>
      </div>
    </Link>
  );
}
