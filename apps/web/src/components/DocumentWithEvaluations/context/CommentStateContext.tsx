"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CommentState {
  hoveredCommentId: string | null;
  expandedCommentId: string | null;
  selectedAgentIds: Set<string>;
}

interface CommentStateContextValue {
  // State
  hoveredCommentId: string | null;
  expandedCommentId: string | null;
  selectedAgentIds: Set<string>;
  
  // Actions
  setHoveredCommentId: (id: string | null) => void;
  setExpandedCommentId: (id: string | null) => void;
  toggleAgentSelection: (agentId: string) => void;
  selectAgent: (agentId: string) => void;
  deselectAgent: (agentId: string) => void;
  selectAllAgents: (agentIds: string[]) => void;
  deselectAllAgents: () => void;
}

const CommentStateContext = createContext<CommentStateContextValue | undefined>(undefined);

export interface CommentStateProviderProps {
  children: ReactNode;
  initialSelectedAgentIds?: string[];
}

export function CommentStateProvider({ 
  children, 
  initialSelectedAgentIds = [] 
}: CommentStateProviderProps) {
  const [state, setState] = useState<CommentState>({
    hoveredCommentId: null,
    expandedCommentId: null,
    selectedAgentIds: new Set(initialSelectedAgentIds),
  });

  const setHoveredCommentId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, hoveredCommentId: id }));
  }, []);

  const setExpandedCommentId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, expandedCommentId: id }));
  }, []);

  const toggleAgentSelection = useCallback((agentId: string) => {
    setState(prev => {
      const newSet = new Set(prev.selectedAgentIds);
      if (newSet.has(agentId)) {
        newSet.delete(agentId);
      } else {
        newSet.add(agentId);
      }
      return { ...prev, selectedAgentIds: newSet };
    });
  }, []);

  const selectAgent = useCallback((agentId: string) => {
    setState(prev => {
      const newSet = new Set(prev.selectedAgentIds);
      newSet.add(agentId);
      return { ...prev, selectedAgentIds: newSet };
    });
  }, []);

  const deselectAgent = useCallback((agentId: string) => {
    setState(prev => {
      const newSet = new Set(prev.selectedAgentIds);
      newSet.delete(agentId);
      return { ...prev, selectedAgentIds: newSet };
    });
  }, []);

  const selectAllAgents = useCallback((agentIds: string[]) => {
    setState(prev => ({
      ...prev,
      selectedAgentIds: new Set(agentIds),
    }));
  }, []);

  const deselectAllAgents = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedAgentIds: new Set(),
    }));
  }, []);

  const value: CommentStateContextValue = {
    hoveredCommentId: state.hoveredCommentId,
    expandedCommentId: state.expandedCommentId,
    selectedAgentIds: state.selectedAgentIds,
    setHoveredCommentId,
    setExpandedCommentId,
    toggleAgentSelection,
    selectAgent,
    deselectAgent,
    selectAllAgents,
    deselectAllAgents,
  };

  return (
    <CommentStateContext.Provider value={value}>
      {children}
    </CommentStateContext.Provider>
  );
}

export function useCommentState() {
  const context = useContext(CommentStateContext);
  if (!context) {
    throw new Error('useCommentState must be used within a CommentStateProvider');
  }
  return context;
}