"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

/**
 * Keeps EvaluationCardsHeader expanded initially, collapses on scroll down,
 * and expands again when scrolled back to the very top.
 */
export function useScrollHeaderBehavior(
  scrollContainerRef: RefObject<HTMLDivElement | null>
) {
  const [isLargeMode, setIsLargeMode] = useState<boolean>(true);
  const isLargeModeRef = useRef<boolean>(true);

  // Keep ref in sync with state
  useEffect(() => {
    isLargeModeRef.current = isLargeMode;
  }, [isLargeMode]);

  useEffect(() => {
    const containerEl = scrollContainerRef.current;
    if (!containerEl) return;

    const handleScroll = () => {
      const atTop = containerEl.scrollTop <= 0;
      if (atTop && !isLargeModeRef.current) {
        setIsLargeMode(true);
      } else if (!atTop && isLargeModeRef.current) {
        setIsLargeMode(false);
      }
    };

    containerEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      containerEl.removeEventListener("scroll", handleScroll);
    };
  }, [scrollContainerRef]);

  return { isLargeMode, setIsLargeMode };
}
