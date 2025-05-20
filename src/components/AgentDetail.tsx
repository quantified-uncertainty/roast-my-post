"use client";

import { useEffect, useState } from "react";

import { Clock, Pencil } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/Button";
import type { Agent } from "@/types/agentSchema";
import { AGENT_TYPE_INFO } from "@/types/agentTypes";
import type { AgentReview } from "@/types/evaluationSchema";
import { getGradeColorStrong, getLetterGrade } from "@/utils/commentUtils";
import { getIcon } from "@/utils/iconMap";

interface AgentDetailProps {
  agent: Agent;
  isOwner?: boolean;
}

export default function AgentDetail({
  agent,
  isOwner = false,
}: AgentDetailProps) {
  const IconComponent = getIcon(agent.iconName);
  const [review, setReview] = useState<AgentReview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReview() {
      try {
        const response = await fetch(`/api/agents/${agent.id}/review`);
        const data = await response.json();
        if (data.review) {
          setReview({
            ...data.review,
            createdAt: new Date(data.review.createdAt),
          });
        }
      } catch (error) {
        console.error("Error fetching agent review:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchReview();
  }, [agent.id]);

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`rounded-lg bg-${AGENT_TYPE_INFO[agent.purpose].color}-100 p-3`}
          >
            <IconComponent
              className={`h-8 w-8 text-${AGENT_TYPE_INFO[agent.purpose].color}-600`}
            />
          </div>
          <div>
            <h2 className="text-xl font-semibold transition-colors group-hover:text-blue-600">
              {agent.name}
            </h2>
            <p className="text-sm text-gray-500">
              {AGENT_TYPE_INFO[agent.purpose].individualTitle} v{agent.version}
              {agent.owner && (
                <>
                  {" • "}
                  <Link
                    href={`/users/${agent.owner.id}`}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    {agent.owner.name || "View Owner"}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/agents/${agent.id}/versions`}>
            <Button variant="secondary" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Version History
            </Button>
          </Link>
          {isOwner && (
            <Link href={`/agents/${agent.id}/edit`}>
              <Button variant="secondary" className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Edit Agent
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="mb-8">
        <p className="text-lg text-gray-700">{agent.description}</p>
      </div>

      {loading ? (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-gray-500">Loading review...</p>
        </div>
      ) : review ? (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Assessments</h2>
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <p className="text-gray-600">{review.summary}</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <span>{review.author}</span>
                <span>•</span>
                <span>{review.createdAt.toLocaleDateString()}</span>
              </div>
            </div>
            <span
              className={`rounded-sm px-2 text-sm font-medium ${getGradeColorStrong(review.grade).className}`}
              style={getGradeColorStrong(review.grade).style}
            >
              {getLetterGrade(review.grade)}
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Primary Instructions</h2>
        <div className="mb-8 whitespace-pre-wrap">
          {agent.genericInstructions}
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Summary Instructions</h2>
        <div className="mb-8 whitespace-pre-wrap">
          {agent.summaryInstructions}
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Comment Instructions</h2>
        <div className="mb-8 whitespace-pre-wrap">
          {agent.commentInstructions}
        </div>
      </div>

      {agent.gradeInstructions && (
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Grade Instructions</h2>
          <div className="mb-8 whitespace-pre-wrap">
            {agent.gradeInstructions}
          </div>
        </div>
      )}
    </div>
  );
}
