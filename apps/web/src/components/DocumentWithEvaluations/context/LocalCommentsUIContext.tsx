"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface LocalCommentsUIContextValue {
  hoveredCommentId: string | null;
  setHoveredCommentId: (id: string | null) => void;
  expandedCommentId: string | null;
  setExpandedCommentId: (id: string | null) => void;
}

const LocalCommentsUIContext = createContext<
  LocalCommentsUIContextValue | undefined
>(undefined);

export function useLocalCommentsUI() {
  const ctx = useContext(LocalCommentsUIContext);
  if (!ctx) {
    throw new Error(
      "useLocalCommentsUI must be used within LocalCommentsUIProvider"
    );
  }
  return ctx;
}

export function LocalCommentsUIProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hoveredCommentId, setHoveredCommentIdState] = useState<string | null>(
    null
  );
  const [expandedCommentId, setExpandedCommentIdState] = useState<
    string | null
  >(null);

  const setHoveredCommentId = useCallback((id: string | null) => {
    setHoveredCommentIdState(id);
  }, []);

  const setExpandedCommentId = useCallback((id: string | null) => {
    setExpandedCommentIdState(id);
  }, []);

  const value = useMemo<LocalCommentsUIContextValue>(
    () => ({
      hoveredCommentId,
      setHoveredCommentId,
      expandedCommentId,
      setExpandedCommentId,
    }),
    [
      hoveredCommentId,
      expandedCommentId,
      setHoveredCommentId,
      setExpandedCommentId,
    ]
  );

  return (
    <LocalCommentsUIContext.Provider value={value}>
      {children}
    </LocalCommentsUIContext.Provider>
  );
}
