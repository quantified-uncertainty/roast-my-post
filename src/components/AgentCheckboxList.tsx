"use client";

import {
  useEffect,
  useState,
} from "react";

import { useFormContext } from "react-hook-form";
import { logger } from "@/lib/logger";

import type { Agent } from "@/types/agentSchema";

interface AgentCheckboxListProps {
  name: string;
  label: string;
  required?: boolean;
  error?: { message?: string };
}

export default function AgentCheckboxList({
  name,
  label,
  required,
  error,
}: AgentCheckboxListProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const { register, setValue, watch } = useFormContext();
  const selectedAgents = watch(name) || "";

  // Register the field with react-hook-form
  useEffect(() => {
    register(name);
  }, [name, register]);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch("/api/agents");
        const data = await response.json();
        setAgents(data.agents);
      } catch (error) {
        logger.error('Error fetching agents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const handleCheckboxChange = (agentId: string, checked: boolean) => {
    const currentAgents =
      selectedAgents && selectedAgents.trim()
        ? selectedAgents
            .split(",")
            .map((id: string) => id.trim())
            .filter((id: string) => id)
        : [];
    let newAgents: string[];

    if (checked) {
      // Avoid duplicates
      if (!currentAgents.includes(agentId)) {
        newAgents = [...currentAgents, agentId];
      } else {
        newAgents = currentAgents;
      }
    } else {
      newAgents = currentAgents.filter((id: string) => id !== agentId);
    }

    setValue(name, newAgents.join(","), { shouldDirty: true });
  };

  if (loading) {
    return <div>Loading agents...</div>;
  }

  return (
    <div>
      <div className="mt-2 flex flex-wrap gap-4">
        {agents.map((agent) => {
          const agentIds =
            selectedAgents && selectedAgents.trim()
              ? selectedAgents
                  .split(",")
                  .map((id: string) => id.trim())
                  .filter((id: string) => id)
              : [];
          const isChecked = agentIds.includes(agent.id);
          return (
            <div key={agent.id} className="flex items-center">
              <input
                type="checkbox"
                id={`${name}-${agent.id}`}
                checked={isChecked}
                onChange={(e) =>
                  handleCheckboxChange(agent.id, e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor={`${name}-${agent.id}`}
                className="ml-2 block text-sm text-gray-900"
              >
                {agent.name}
              </label>
            </div>
          );
        })}
      </div>
      {error?.message && (
        <p className="mt-1 text-sm text-red-600">{error.message}</p>
      )}
    </div>
  );
}
