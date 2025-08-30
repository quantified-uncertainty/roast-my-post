"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { formatDistanceToNow } from "date-fns";
import type { Agent, AgentVersion } from "@roast/ai";

interface AgentVersionsClientProps {
  agent: Agent;
  versions: AgentVersion[];
  isOwner?: boolean;
}

export default function AgentVersionsClient({
  agent,
  versions,
  isOwner: _isOwner,
}: AgentVersionsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const versionParam = searchParams.get("version");

  // Find the version that matches the URL param, or use the first version
  const initialVersion = versionParam
    ? versions.find((v) => v.version.toString() === versionParam) || versions[0]
    : versions[0];

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    versions.length > 0 ? initialVersion?.id || versions[0].id : null
  );

  // Update the URL when the selected version changes
  const updateQueryParam = (versionId: string | null) => {
    if (!versionId) return;

    const selectedVersion = versions.find((v) => v.id === versionId);
    if (!selectedVersion) return;

    const newUrl = `/agents/${agent.id}/versions?version=${selectedVersion.version}`;
    router.push(newUrl, { scroll: false });
  };

  // Handle version selection
  const handleVersionSelect = (versionId: string) => {
    setSelectedVersionId(versionId);
    updateQueryParam(versionId);
  };

  // If URL param changes, update the selected version
  useEffect(() => {
    if (versionParam && versions.length > 0) {
      const version = versions.find(
        (v) => v.version.toString() === versionParam
      );
      if (version && version.id !== selectedVersionId) {
        setSelectedVersionId(version.id);
      }
    }
  }, [versionParam, versions, selectedVersionId]);

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const selectedVersion = versions.find(
    (version) => version.id === selectedVersionId
  );

  return (
    <div className="w-full">
      {versions.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <h3 className="mb-2 text-lg font-medium">No versions found</h3>
          <p className="mb-4 text-gray-500">
            This agent doesn't have any versions yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Left column - Versions list (5 columns) */}
          <div className="col-span-5">
            <div className="rounded-t-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <h2 className="text-lg font-medium">
                  Versions ({versions.length})
                </h2>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {versions.map((version, idx) => (
                  <div
                    key={version.id}
                    className={`cursor-pointer px-4 py-3 transition-colors hover:bg-gray-50 ${
                      selectedVersionId === version.id
                        ? "bg-blue-50 border-l-4 border-blue-500"
                        : "bg-white"
                    } ${idx !== versions.length - 1 ? "border-b border-gray-200" : ""}`}
                    onClick={() => handleVersionSelect(version.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          Version {version.version}
                          {version.version === agent.version && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="line-clamp-2 text-sm text-gray-600">
                        {version.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column - Full version details (7 columns) */}
          <div className="col-span-7 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {selectedVersion ? (
              <div>
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                  <h2 className="text-lg font-medium">Version Details</h2>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Version:</span>{" "}
                      {selectedVersion.version}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>{" "}
                      {formatDate(selectedVersion.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedVersion.name}
                    </div>
                    <div>
                      <span className="font-medium">Provides Grades:</span>{" "}
                      {selectedVersion.providesGrades ? "Yes" : "No"}
                    </div>
                  </div>
                </div>

                <div className="max-h-[500px] overflow-y-auto p-6">
                  <div className="space-y-6">
                    {selectedVersion.description && (
                      <div>
                        <h3 className="mb-2 text-lg font-medium text-gray-900">
                          Description
                        </h3>
                        <div className="prose max-w-none text-sm">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                          >
                            {selectedVersion.description}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {selectedVersion.primaryInstructions && (
                      <div>
                        <h3 className="mb-2 text-lg font-medium text-gray-900">
                          Primary Instructions
                        </h3>
                        <div className="rounded-md bg-gray-50 p-4">
                          <pre className="whitespace-pre-wrap text-sm text-gray-700">
                            {selectedVersion.primaryInstructions}
                          </pre>
                        </div>
                      </div>
                    )}

                    {selectedVersion.selfCritiqueInstructions && (
                      <div>
                        <h3 className="mb-2 text-lg font-medium text-gray-900">
                          Self-Critique Instructions
                        </h3>
                        <div className="rounded-md bg-gray-50 p-4">
                          <pre className="whitespace-pre-wrap text-sm text-gray-700">
                            {selectedVersion.selfCritiqueInstructions}
                          </pre>
                        </div>
                      </div>
                    )}

                    {selectedVersion.readme && (
                      <div>
                        <h3 className="mb-2 text-lg font-medium text-gray-900">
                          README
                        </h3>
                        <div className="prose max-w-none text-sm">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                          >
                            {selectedVersion.readme}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-gray-500">
                Select a version to view its details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}