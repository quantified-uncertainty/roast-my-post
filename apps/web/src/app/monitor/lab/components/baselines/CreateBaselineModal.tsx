"use client";

import { useState, useEffect, useCallback } from "react";
import { XMarkIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { CorpusDocument } from "../../types";
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

export function CreateBaselineModal({ agentId, onClose, onCreated }: CreateBaselineModalProps) {
  const [name, setName] = useState(getDefaultName);
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<CorpusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

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

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSearch = () => {
    fetchDocuments(searchQuery || undefined);
  };

  const toggleDocument = (docId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(docId)) {
      newSet.delete(docId);
    } else {
      newSet.add(docId);
    }
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(documents.map((d) => d.documentId)));
  };

  const handleSelectNone = () => {
    setSelectedIds(new Set());
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedIds.size === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/monitor/lab/baselines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          name: name.trim(),
          description: description.trim() || undefined,
          documentIds: Array.from(selectedIds),
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
                Select Documents ({selectedIds.size} selected)
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

            {/* Document List */}
            <div className="border rounded-md max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading documents...</div>
              ) : documents.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No documents found</div>
              ) : (
                <div className="divide-y">
                  {documents.map((doc) => (
                    <label
                      key={doc.documentId}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(doc.documentId)}
                        onChange={() => toggleDocument(doc.documentId)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {truncate(doc.title, 60)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {doc.evaluationCount} evaluations
                        </p>
                      </div>
                    </label>
                  ))}
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
            disabled={!name.trim() || selectedIds.size === 0 || creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {creating ? "Creating..." : `Create Baseline (${selectedIds.size} docs)`}
          </button>
        </div>
      </div>
    </div>
  );
}
