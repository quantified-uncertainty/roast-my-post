'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useDebounce } from '@/hooks/useDebounce';

interface ClaimEvaluation {
  id: string;
  claim: string;
  summaryMean: number | null;
  createdAt: string;
  context?: string | null;
  rawOutput?: {
    evaluations?: Array<{ modelId: string }>;
  };
}

interface FetchResponse {
  data: ClaimEvaluation[];
  nextCursor: string | null;
  hasMore: boolean;
}

const ITEM_HEIGHT = 96; // Height of each list item in pixels
const BUFFER_SIZE = 5; // Extra items to render above/below viewport

export function ClaimEvaluationsList() {
  const [items, setItems] = useState<ClaimEvaluation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'agreement'>('date');
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
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT);
    const endIndex = Math.min(
      filteredItems.length,
      startIndex + visibleCount + BUFFER_SIZE * 2
    );
    const offsetY = startIndex * ITEM_HEIGHT;

    return { startIndex, endIndex, totalHeight, offsetY };
  }, [filteredItems.length, scrollTop, containerHeight]);

  const visibleItems = filteredItems.slice(startIndex, endIndex);

  // Fetch data from API
  const fetchData = useCallback(
    async (reset = false) => {
      if (loading || (!hasMore && !reset)) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: '50',
          sortBy,
          order: 'desc',
        });

        if (debouncedSearch) {
          params.set('search', debouncedSearch);
        }

        if (!reset && nextCursor) {
          params.set('cursor', nextCursor);
        }

        const response = await fetch(`/api/claim-evaluations?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch evaluations');
        }

        const data: FetchResponse = await response.json();

        setItems((prev) => (reset ? data.data : [...prev, ...data.data]));
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    },
    [loading, hasMore, nextCursor, sortBy, debouncedSearch]
  );

  // Reset and fetch when search or sort changes
  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    setHasMore(true);
    fetchData(true);
  }, [debouncedSearch, sortBy]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setScrollTop(container.scrollTop);

    const scrolledToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 200;

    if (scrolledToBottom && hasMore && !loading) {
      fetchData();
    }
  }, [hasMore, loading, fetchData]);

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
            onChange={(e) => setSortBy(e.target.value as 'date' | 'agreement')}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="date">Latest</option>
            <option value="agreement">Agreement</option>
          </select>
        </div>
      </div>

      {/* Virtual scrolling container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="overflow-y-auto rounded-lg border border-gray-200 bg-white"
        style={{ height: '600px' }}
      >
        <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
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
            {searchQuery ? 'No claims match your search' : 'No evaluations yet'}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-500">
        Showing {filteredItems.length} claim{filteredItems.length !== 1 ? 's' : ''}
        {searchQuery && items.length !== filteredItems.length && (
          <span> (filtered from {items.length})</span>
        )}
      </div>
    </div>
  );
}

function ClaimCard({ item }: { item: ClaimEvaluation }) {
  // summaryMean is already 0-100, no need to multiply by 100
  const agreementPercent = item.summaryMean
    ? Math.round(item.summaryMean)
    : null;

  const agreementColor =
    agreementPercent === null
      ? 'text-gray-400'
      : agreementPercent >= 70
        ? 'text-green-600'
        : agreementPercent <= 30
          ? 'text-red-600'
          : 'text-yellow-600';

  // Count total evaluations from rawOutput
  const evaluationCount = item.rawOutput?.evaluations?.length || 0;

  return (
    <Link
      href={`/claim-evaluations/${item.id}`}
      className="block border-b border-gray-200 p-4 transition-colors hover:bg-gray-50"
      style={{ height: `${ITEM_HEIGHT}px` }}
    >
      <div className="flex h-full items-start justify-between gap-4">
        <div className="flex-1 overflow-hidden">
          <p className="mb-1 line-clamp-2 font-medium text-gray-900">{item.claim}</p>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>
              {new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {evaluationCount > 0 && (
              <>
                <span>•</span>
                <span>{evaluationCount} {evaluationCount === 1 ? 'evaluation' : 'evaluations'}</span>
              </>
            )}
          </div>
        </div>

        {agreementPercent !== null && (
          <div className="flex-shrink-0 text-right">
            <div className={`text-2xl font-bold ${agreementColor}`}>
              {agreementPercent}%
            </div>
            <div className="text-xs text-gray-500">agreement</div>
          </div>
        )}
      </div>
    </Link>
  );
}
