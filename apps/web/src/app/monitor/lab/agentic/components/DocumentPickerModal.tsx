"use client";

import { useState, useEffect, useCallback } from "react";
import { XMarkIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface CorpusDocument {
  documentId: string;
  title: string;
  contentLength: number;
  evaluationCount: number;
}

interface DocumentPickerModalProps {
  onSelect: (doc: { id: string; title: string }) => void;
  onClose: () => void;
}

export function DocumentPickerModal({ onSelect, onClose }: DocumentPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<CorpusDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async (filter?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("filter", filter);
      const res = await fetch(`/api/monitor/lab/corpus?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  const handleSearch = () => {
    void fetchDocuments(searchQuery.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Select Document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Filter documents..."
                autoFocus
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm disabled:opacity-50"
            >
              Search
            </button>
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {loading ? (
            <div className="p-4 text-center text-gray-500 text-sm">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No documents found</div>
          ) : (
            <div className="border rounded-md divide-y max-h-80 overflow-y-auto">
              {documents.map((doc) => (
                <button
                  key={doc.documentId}
                  onClick={() => onSelect({ id: doc.documentId, title: doc.title })}
                  className="w-full text-left p-3 hover:bg-blue-50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {doc.evaluationCount} evaluations
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
