import { useEffect, useRef, useState } from "react";
import {
  SCROLL_THRESHOLD_TOP,
  SCROLL_THRESHOLD_COLLAPSE,
  SCROLL_DELAY_EXPAND,
  EVAL_SECTION_OFFSET,
} from "../constants";

interface UseScrollBehaviorProps {
  evaluationsSectionRef: React.RefObject<HTMLDivElement>;
  isLargeMode: boolean;
}

export function useScrollBehavior({
  evaluationsSectionRef,
  isLargeMode,
}: UseScrollBehaviorProps) {
  const [headerVisible, setHeaderVisible] = useState(true);
  const [localIsLargeMode, setLocalIsLargeMode] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let lastScrollTop = 0;
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;

      // Clear any existing timeout
      clearTimeout(scrollTimeout);

      // Check if evaluations section is in view
      if (evaluationsSectionRef.current) {
        const evalSection = evaluationsSectionRef.current;
        const evalSectionTop = evalSection.offsetTop;

        // Hide header when evaluations section comes into view
        if (scrollTop >= evalSectionTop - EVAL_SECTION_OFFSET) {
          setHeaderVisible(false);
        } else {
          setHeaderVisible(true);
        }
      }

      // If at the very top, show large mode with a slight delay
      if (scrollTop <= SCROLL_THRESHOLD_TOP) {
        scrollTimeout = setTimeout(() => {
          setLocalIsLargeMode(true);
        }, SCROLL_DELAY_EXPAND);
      }
      // If scrolling down from near the top, hide large mode
      else if (
        scrollTop > lastScrollTop &&
        scrollTop > SCROLL_THRESHOLD_COLLAPSE &&
        localIsLargeMode
      ) {
        setLocalIsLargeMode(false);
      }

      lastScrollTop = scrollTop;
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [evaluationsSectionRef, localIsLargeMode]);

  return {
    scrollContainerRef,
    headerVisible,
    isLargeMode: localIsLargeMode,
    setIsLargeMode: setLocalIsLargeMode,
  };
}