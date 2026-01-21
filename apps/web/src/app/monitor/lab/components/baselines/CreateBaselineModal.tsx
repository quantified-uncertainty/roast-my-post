"use client";

import { useState, useEffect, useCallback } from "react";
import { XMarkIcon, MagnifyingGlassIcon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import type { CorpusDocument, EvaluationVersionSummary } from "../../types";
import { truncate } from "../../utils/formatters";

interface CreateBaselineModalProps {
  agentId: string;
  onClose: () => void;
  onCreated: () => void;
}

function getDefaultName(): string {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  return `Baseline ${date}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

export function CreateBaselineModal({ agentId, onClose, onCreated }: CreateBaselineModalProps) {
  const [name, setName] = useState(getDefaultName);
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<CorpusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Selected version per document: Map<documentId, versionId>
  const [selectedVersions, setSelectedVersions] = useState<Map<string, string>>(new Map());

  // Expanded documents for viewing versions
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [versions, setVersions] = useState<EvaluationVersionSummary[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Cache versions per document to avoid refetching
  const [versionsCache, setVersionsCache] = useState<Map<string, EvaluationVersionSummary[]>>(new Map());

  const fetchDocuments = useCallback(async (filter?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ agentId });
      if (filter) params.set("filter", filter);
      const res = await fetch(`/api/monitor/lab/corpus?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents);
      }
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const fetchVersions = useCallback(async (documentId: string): Promise<EvaluationVersionSummary[]> => {
    // Check cache first
    const cached = versionsCache.get(documentId);
    if (cached) return cached;

    setLoadingVersions(true);
    try {
      const params = new URLSearchParams({ agentId, documentId });
      const res = await fetch(`/api/monitor/lab/corpus/versions?${params}`);
      if (res.ok) {
        const data = await res.json();
        const fetchedVersions = data.versions as EvaluationVersionSummary[];
        setVersionsCache(prev => new Map(prev).set(documentId, fetchedVersions));
        return fetchedVersions;
      }
    } finally {
      setLoadingVersions(false);
    }
    return [];
  }, [agentId, versionsCache]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSearch = () => {
    fetchDocuments(searchQuery || undefined);
  };

  const toggleDocument = async (docId: string) => {
    const newSelected = new Map(selectedVersions);
    if (newSelected.has(docId)) {
      // Deselect document
      newSelected.delete(docId);
    } else {
      // Select document - auto-select latest version
      const docVersions = versionsCache.get(docId) || await fetchVersions(docId);
      if (docVersions.length > 0) {
        newSelected.set(docId, docVersions[0].id); // Latest version (ordered desc)
      }
    }
    setSelectedVersions(newSelected);
  };

  const selectVersion = (docId: string, versionId: string) => {
    const newSelected = new Map(selectedVersions);
    newSelected.set(docId, versionId);
    setSelectedVersions(newSelected);
  };

  const toggleExpand = async (docId: string) => {
    if (expandedDocId === docId) {
      setExpandedDocId(null);
      setVersions([]);
    } else {
      setExpandedDocId(docId);
      const docVersions = await fetchVersions(docId);
      setVersions(docVersions);
    }
  };

  const handleSelectAll = async () => {
    const newSelected = new Map<string, string>();
    for (const doc of documents) {
      const docVersions = versionsCache.get(doc.documentId) || await fetchVersions(doc.documentId);
      if (docVersions.length > 0) {
        newSelected.set(doc.documentId, docVersions[0].id);
      }
    }
    setSelectedVersions(newSelected);
  };

  const handleSelectNone = () => {
    setSelectedVersions(new Map());
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedVersions.size === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/monitor/lab/baselines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          name: name.trim(),
          description: description.trim() || undefined,
          evaluationVersionIds: Array.from(selectedVersions.values()),
        }),
      });
      if (res.ok) {
        onCreated();
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Create Validation Baseline</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Name & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Pre-refactor baseline"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Baseline before filter changes"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Document Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Documents ({selectedVersions.size} selected)
              </label>
              <div className="space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Select All
                </button>
                <button
                  onClick={handleSelectNone}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Select None
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center space-x-2 mb-3">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search documents..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              >
                Search
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-2">
              Expand a document to select a specific version. By default, the latest version is used.
            </p>

            {/* Document List */}
            <div className="border rounded-md max-h-72 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading documents...</div>
              ) : documents.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No documents found</div>
              ) : (
                <div className="divide-y">
                  {documents.map((doc) => {
                    const isSelected = selectedVersions.has(doc.documentId);
                    const selectedVersionId = selectedVersions.get(doc.documentId);

                    return (
                      <div key={doc.documentId}>
                        <div className="flex items-center p-3 hover:bg-gray-50">
                          {/* Expand button */}
                          <button
                            onClick={() => toggleExpand(doc.documentId)}
                            className="mr-2 text-gray-400 hover:text-gray-600"
                          >
                            {expandedDocId === doc.documentId ? (
                              <ChevronDownIcon className="h-4 w-4" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4" />
                            )}
                          </button>

                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleDocument(doc.documentId)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300"
                          />

                          {/* Document info */}
                          <div className="ml-3 flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {truncate(doc.title, 60)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {doc.evaluationCount} evaluations
                              {isSelected && selectedVersionId && (
                                <span className="ml-2 text-blue-600">
                                  (version selected)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Expanded versions */}
                        {expandedDocId === doc.documentId && (
                          <div className="bg-gray-50 px-10 py-2 border-t border-gray-100">
                            {loadingVersions ? (
                              <p className="text-xs text-gray-500">Loading versions...</p>
                            ) : versions.length === 0 ? (
                              <p className="text-xs text-gray-500">No versions found</p>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-600 mb-2">
                                  Select version ({versions.length} available):
                                </p>
                                {versions.map((v, idx) => (
                                  <label
                                    key={v.id}
                                    className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer hover:bg-gray-100 p-1 rounded"
                                  >
                                    <input
                                      type="radio"
                                      name={`version-${doc.documentId}`}
                                      checked={selectedVersionId === v.id}
                                      onChange={() => selectVersion(doc.documentId, v.id)}
                                      className="h-3 w-3 text-blue-600 border-gray-300"
                                    />
                                    <span className="font-mono text-gray-400">v{v.version}</span>
                                    <span>{formatDate(v.createdAt)}</span>
                                    {v.grade !== null && (
                                      <span className="text-gray-500">Grade: {v.grade}</span>
                                    )}
                                    {idx === 0 && (
                                      <span className="text-blue-500 text-[10px]">(latest)</span>
                                    )}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || selectedVersions.size === 0 || creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {creating ? "Creating..." : `Create Baseline (${selectedVersions.size} docs)`}
          </button>
        </div>
      </div>
    </div>
  );
}
