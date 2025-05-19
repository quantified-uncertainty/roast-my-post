"use client";

import { useEffect, useState } from "react";

import { useFormContext } from "react-hook-form";

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

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch("/api/agents");
        const data = await response.json();
        setAgents(data.agents);
      } catch (error) {
        console.error("Error fetching agents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const handleCheckboxChange = (agentId: string, checked: boolean) => {
    const currentAgents = selectedAgents ? selectedAgents.split(",") : [];
    let newAgents: string[];

    if (checked) {
      newAgents = [...currentAgents, agentId];
    } else {
      newAgents = currentAgents.filter((id: string) => id !== agentId);
    }

    setValue(name, newAgents.join(","));
  };

  if (loading) {
    return <div>Loading agents...</div>;
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-2 space-y-2">
        {agents.map((agent) => {
          const isChecked = selectedAgents.split(",").includes(agent.id);
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
                {agent.name} ({agent.purpose})
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
