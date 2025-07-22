"use client";

import {
  useEffect,
  useState,
} from "react";

import { Button } from "@/components/Button";
import { logger } from "@/lib/logger";
import type { Agent } from "@/types/agentSchema";
import {
  ChevronDownIcon,
  PlayIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

interface AgentSelectorProps {
  onSelect?: (agentId: string) => void;
  onSelectMultiple?: (agentIds: string[]) => void;
  showRunButton?: boolean;
  className?: string;
  variant?: "dropdown" | "list" | "grid";
  selectedAgentIds?: string[];
  disabled?: boolean;
}

export function AgentSelector({
  onSelect,
  onSelectMultiple,
  showRunButton = true,
  className = "",
  variant = "dropdown",
  selectedAgentIds = [],
  disabled = false,
}: AgentSelectorProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedAgentIds);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch("/api/agents");
        if (!response.ok) {
          throw new Error("Failed to fetch agents");
        }
        const data = await response.json();
        setAgents(data.agents || []);
      } catch (error) {
        logger.error('Error fetching agents:', error);
        setError("Failed to load agents");
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const handleSingleSelect = (agentId: string) => {
    if (onSelect) {
      onSelect(agentId);
    }
    setIsOpen(false);
  };

  const handleMultipleToggle = (agentId: string) => {
    const newSelected = localSelectedIds.includes(agentId)
      ? localSelectedIds.filter(id => id !== agentId)
      : [...localSelectedIds, agentId];
    
    setLocalSelectedIds(newSelected);
    if (onSelectMultiple) {
      onSelectMultiple(newSelected);
    }
  };

  const handleRunSelected = () => {
    if (onSelectMultiple && localSelectedIds.length > 0) {
      onSelectMultiple(localSelectedIds);
      setLocalSelectedIds([]);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 w-48 rounded bg-gray-200"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-sm text-red-600 ${className}`}>
        {error}
      </div>
    );
  }

  if (variant === "dropdown") {
    return (
      <div className={`relative ${className}`}>
        <Button
          variant="secondary"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <PlayIcon className="h-4 w-4" />
          Run Evaluation
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
        
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border border-gray-200 bg-white shadow-lg">
              <div className="max-h-64 overflow-y-auto py-1">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleSingleSelect(agent.id)}
                    disabled={disabled}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    <PlayIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900">{agent.name}</div>
                      <div className="text-sm text-gray-500 line-clamp-2">{agent.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={className}>
        <div className="space-y-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`agent-${agent.id}`}
                  checked={localSelectedIds.includes(agent.id)}
                  onChange={() => handleMultipleToggle(agent.id)}
                  disabled={disabled}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <label htmlFor={`agent-${agent.id}`} className="flex-1 cursor-pointer">
                  <div className="font-medium text-gray-900">{agent.name}</div>
                  <div className="text-sm text-gray-500">{agent.description}</div>
                </label>
              </div>
              <Button
                variant="secondary"
                onClick={() => handleSingleSelect(agent.id)}
                disabled={disabled}
                className="flex items-center gap-1 text-sm px-2 py-1"
              >
                <PlayIcon className="h-3 w-3" />
                Run
              </Button>
            </div>
          ))}
        </div>
        
        {showRunButton && localSelectedIds.length > 0 && (
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {localSelectedIds.length} agents selected
            </span>
            <Button
              onClick={handleRunSelected}
              disabled={disabled}
              className="flex items-center gap-2"
            >
              <PlayIcon className="h-4 w-4" />
              Run {localSelectedIds.length} Evaluations
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-gray-900">{agent.name}</h3>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {agent.description}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => handleSingleSelect(agent.id)}
                  disabled={disabled}
                  className="flex items-center gap-1 text-sm px-2 py-1"
                >
                  <PlayIcon className="h-3 w-3" />
                  Run
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

interface QuickAgentButtonsProps {
  onSelect: (agentId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function QuickAgentButtons({ onSelect, disabled = false, className = "" }: QuickAgentButtonsProps) {
  const [popularAgents, setPopularAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopularAgents = async () => {
      try {
        const response = await fetch("/api/agents");
        if (!response.ok) {
          throw new Error("Failed to fetch agents");
        }
        const data = await response.json();
        // Take the first 3 agents as "popular" ones
        setPopularAgents((data.agents || []).slice(0, 3));
      } catch (error) {
        logger.error('Error fetching popular agents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularAgents();
  }, []);

  if (loading) {
    return (
      <div className={`flex gap-2 ${className}`}>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-9 w-24 animate-pulse rounded bg-gray-200" />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {popularAgents.map((agent) => (
        <Button
          key={agent.id}
          variant="secondary"
          onClick={() => onSelect(agent.id)}
          disabled={disabled}
          className="flex items-center gap-1 text-sm px-2 py-1"
        >
          <PlayIcon className="h-3 w-3" />
          {agent.name}
        </Button>
      ))}
    </div>
  );
}