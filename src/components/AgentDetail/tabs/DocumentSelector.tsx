"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Search, X } from "lucide-react";

interface Document {
  id: string;
  title: string;
  author?: string;
  lastEvaluatedAt?: string;
}

interface DocumentSelectorProps {
  agentId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function DocumentSelector({
  agentId,
  selectedIds,
  onChange,
}: DocumentSelectorProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/agents/${agentId}/documents`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }
      
      const data = await response.json();
      setDocuments(data.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const filteredDocuments = documents.filter(doc => {
    const query = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(query) ||
      (doc.author && doc.author.toLowerCase().includes(query))
    );
  });

  const toggleDocument = (docId: string) => {
    if (selectedIds.includes(docId)) {
      onChange(selectedIds.filter(id => id !== docId));
    } else {
      onChange([...selectedIds, docId]);
    }
  };

  const clearSelection = () => {
    onChange([]);
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        Loading documents...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-md bg-gray-50 p-4">
        <p className="text-sm text-gray-600">
          No documents have been evaluated by this agent yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={clearSelection}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto rounded-md border border-gray-200">
        {filteredDocuments.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No documents match your search
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDocuments.map((doc) => (
              <label
                key={doc.id}
                className="flex cursor-pointer items-start gap-3 p-4 hover:bg-gray-50"
              >
                <div className="flex h-5 items-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(doc.id)}
                    onChange={() => toggleDocument(doc.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {doc.author && `by ${doc.author}`}
                    {doc.author && doc.lastEvaluatedAt && " • "}
                    {doc.lastEvaluatedAt && `Last evaluated: ${new Date(doc.lastEvaluatedAt).toLocaleDateString()}`}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500">
        Selected: {selectedIds.length} document{selectedIds.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}