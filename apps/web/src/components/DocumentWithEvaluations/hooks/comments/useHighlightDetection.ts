import { useEffect, useState, useRef, RefObject } from "react";
import { checkHighlightsReady } from "@/shared/utils/ui/commentPositioning";
import { INITIALIZATION_DELAY } from "../../constants";

export interface UseHighlightDetectionResult {
  highlightsReady: boolean;
  hasInitialized: boolean;
  highlightCache: Map<string, HTMLElement>;
}

/**
 * Hook to detect when highlight elements are ready in the DOM.
 * Monitors for data-tags elements and maintains a cache for performance.
 *
 * @param contentRef - Reference to the content container element
 * @param expectedCount - Expected number of highlights to wait for
 * @returns Object with highlight readiness state and cache
 */
export function useHighlightDetection(
  contentRef: RefObject<HTMLDivElement | null>,
  expectedCount: number
): UseHighlightDetectionResult {
  const [highlightsReady, setHighlightsReady] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const highlightCacheRef = useRef<Map<string, HTMLElement>>(new Map());
  const observerRef = useRef<MutationObserver | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!contentRef.current || expectedCount === 0) {
      setHighlightsReady(true);
      return;
    }

    let isActive = true;

    // Helper to update cache from DOM
    const updateHighlightCacheFromDOM = (container: HTMLElement) => {
      const newCache = new Map<string, HTMLElement>();
      const elements = container.querySelectorAll("[data-tags]");

      elements.forEach((el) => {
        const tagsAttr = el.getAttribute("data-tags");
        if (tagsAttr) {
          try {
            const tags = JSON.parse(tagsAttr) as string[];
            tags.forEach((t) => newCache.set(t, el as HTMLElement));
          } catch (_e) {
            // ignore malformed JSON
          }
        }
      });

      highlightCacheRef.current = newCache;
    };

    // Check if highlights already exist before resetting
    const alreadyReady = checkHighlightsReady(
      contentRef.current,
      expectedCount
    );

    if (alreadyReady) {
      // Highlights already exist, just update cache
      updateHighlightCacheFromDOM(contentRef.current);
      setHighlightsReady(true);

      if (!hasInitialized) {
        setHasInitialized(true);
      }
      return;
    }

    // Reset states only if highlights aren't ready
    setHighlightsReady(false);
    setHasInitialized(false);
    highlightCacheRef.current.clear();

    const updateHighlightCache = () => {
      if (!contentRef.current || !isActive) return;

      updateHighlightCacheFromDOM(contentRef.current);

      // Check if we have enough highlights
      const ready = checkHighlightsReady(contentRef.current, expectedCount);

      if (ready) {
        setHighlightsReady(true);

        // Mark as initialized after a delay
        if (!hasInitialized) {
          initTimeoutRef.current = setTimeout(() => {
            if (isActive) {
              setHasInitialized(true);
            }
          }, INITIALIZATION_DELAY);
        }

        // Disconnect observer once ready
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      }
    };

    // Helper to check if mutations contain highlight changes
    const hasHighlightChanges = (mutations: MutationRecord[]): boolean => {
      return mutations.some((mutation) => {
        if (mutation.type === "childList") {
          const addedNodes = Array.from(mutation.addedNodes);
          return addedNodes.some(
            (node) =>
              node instanceof Element &&
              (node.hasAttribute("data-tags") ||
                node.querySelector("[data-tags]"))
          );
        }
        return (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-tags"
        );
      });
    };

    // Use MutationObserver for efficient DOM monitoring
    observerRef.current = new MutationObserver((mutations) => {
      if (hasHighlightChanges(mutations)) {
        updateHighlightCache();
      }
    });

    observerRef.current.observe(contentRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-tags"],
    });

    // Initial check after a short delay
    const initialCheckDelay = 100; // ms
    const checkTimeout = setTimeout(updateHighlightCache, initialCheckDelay);

    return () => {
      isActive = false;
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      clearTimeout(checkTimeout);
    };
  }, [expectedCount, contentRef]);

  return {
    highlightsReady,
    hasInitialized,
    highlightCache: highlightCacheRef.current,
  };
}
