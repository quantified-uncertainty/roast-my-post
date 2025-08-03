import { useEffect, useState, useMemo, RefObject } from "react";

export interface VirtualScrollingOptions {
  itemHeight: number;
  overscan: number;
  enabled: boolean;
}

export interface VirtualScrollingResult<T> {
  visibleItems: Array<{ item: T; originalIndex: number }>;
  startSpacer: number;
  endSpacer: number;
  visibleRange: { start: number; end: number };
}

// Constants for virtual scrolling
const SCROLL_UPDATE_DELAY = 50; // ms - throttle scroll updates
const DEFAULT_VISIBLE_END = 50; // Initial number of items to show

/**
 * Hook to implement virtual scrolling for large lists.
 * Only renders items visible in the viewport plus overscan.
 * 
 * @param items - Array of items to virtually scroll
 * @param containerRef - Reference to the scroll container
 * @param options - Configuration for item height, overscan, and enabled state
 * @returns Object with visible items and spacer dimensions
 */
export function useVirtualScrolling<T>(
  items: T[],
  containerRef: RefObject<HTMLElement | null>,
  options: VirtualScrollingOptions
): VirtualScrollingResult<T> {
  const { itemHeight, overscan, enabled } = options;
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: DEFAULT_VISIBLE_END });

  // Calculate visible items with overscan
  const visibleItems = useMemo(() => {
    if (!enabled) {
      return items.map((item, index) => ({ item, originalIndex: index }));
    }

    const start = Math.max(0, visibleRange.start - overscan);
    const end = Math.min(items.length, visibleRange.end + overscan);
    
    return items.slice(start, end).map((item, idx) => ({
      item,
      originalIndex: start + idx
    }));
  }, [items, visibleRange, overscan, enabled]);

  // Track visible range based on scroll position
  useEffect(() => {
    if (!containerRef.current || !enabled) return;

    const getScrollContainer = () => containerRef.current?.parentElement;
    
    const calculateVisibleRange = (container: HTMLElement) => {
      const scrollTop = container.scrollTop;
      const viewportHeight = container.clientHeight;
      
      // Calculate which items should be visible
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.ceil((scrollTop + viewportHeight) / itemHeight);
      
      return {
        start: Math.max(0, startIndex),
        end: Math.min(items.length, endIndex)
      };
    };

    const updateVisibleRange = () => {
      const container = getScrollContainer();
      if (!container) return;
      
      setVisibleRange(calculateVisibleRange(container));
    };

    const container = getScrollContainer();
    if (!container) return;

    // Throttled scroll handler
    let scrollTimeout: NodeJS.Timeout | null = null;
    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateVisibleRange, SCROLL_UPDATE_DELAY);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    updateVisibleRange(); // Initial calculation

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [enabled, items.length, itemHeight, containerRef]);

  // Calculate spacers for virtual scrolling
  const spacers = useMemo(() => {
    if (!enabled) {
      return { start: 0, end: 0 };
    }
    
    const startSpacer = visibleRange.start * itemHeight;
    const endSpacer = (items.length - visibleRange.end) * itemHeight;
    
    // Adjust spacers to account for overscan
    const overscanOffset = overscan * itemHeight;
    
    return {
      start: Math.max(0, startSpacer - overscanOffset),
      end: Math.max(0, endSpacer - overscanOffset)
    };
  }, [enabled, visibleRange, items.length, itemHeight, overscan]);

  return {
    visibleItems,
    startSpacer: spacers.start,
    endSpacer: spacers.end,
    visibleRange,
  };
}