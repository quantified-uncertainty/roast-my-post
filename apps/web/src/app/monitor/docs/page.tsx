"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, RotateCcw } from "lucide-react";
import { ROUTES } from "@/constants/routes";

interface Document {
  id: string;
  createdAt: string;
  updatedAt: string;
  submittedBy: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  title: string;
  evaluationCount: number;
}

export default function DocsMonitorPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);

  const fetchDocs = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await fetch("/api/monitor/docs");
      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }
      const data = await response.json();
      setDocs(data.docs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRerunAll = async () => {
    if (!selectedDoc) return;

    if (!confirm(`Re-run all ${selectedDoc.evaluationCount} evaluations for this document?`)) {
      return;
    }

    try {
      setIsRerunning(true);
      const response = await fetch(`/api/monitor/docs/${selectedDoc.id}/rerun-all`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to re-run evaluations');
      }

      const result = await response.json();
      alert(`Re-run started: ${result.successCount}/${result.totalEvaluations} jobs created`);

      await fetchDocs(true);
    } catch (err) {
      console.error('Failed to re-run evaluations:', err);
      alert(err instanceof Error ? err.message : 'Failed to re-run evaluations');
    } finally {
      setIsRerunning(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading documents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Documents Monitor</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => fetchDocs(true)}
            disabled={isRefreshing}
            className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh documents"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="text-sm text-gray-500">
            Last 20 documents
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Document List */}
        <div className="col-span-5 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Documents</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[calc(100vh-300px)] overflow-y-auto">
            {docs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedDoc?.id === doc.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="font-medium text-gray-900 truncate">
                  {doc.title}
                </div>
                <div className="mt-1 text-sm text-gray-500 flex items-center gap-2">
                  <span>{doc.evaluationCount} evaluations</span>
                  <span>-</span>
                  <span>{doc.submittedBy?.name || doc.submittedBy?.email || 'Unknown'}</span>
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  {new Date(doc.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Document Details */}
        <div className="col-span-7">
          {selectedDoc ? (
            <div className="bg-white shadow rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedDoc.title}
                </h3>
                <button
                  onClick={handleRerunAll}
                  disabled={isRerunning || selectedDoc.evaluationCount === 0}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Re-run all evaluations for this document"
                >
                  <RotateCcw className={`h-4 w-4 ${isRerunning ? 'animate-spin' : ''}`} />
                  {isRerunning ? 'Re-running...' : 'Re-run All'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="font-medium text-gray-700">Document ID</dt>
                  <dd className="text-gray-900 font-mono text-xs mt-1">{selectedDoc.id}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-700">Evaluations</dt>
                  <dd className="text-gray-900 mt-1">{selectedDoc.evaluationCount}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-700">Uploaded by</dt>
                  <dd className="mt-1">
                    {selectedDoc.submittedBy ? (
                      <Link
                        href={ROUTES.USERS.PROFILE(selectedDoc.submittedBy.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {selectedDoc.submittedBy.name || selectedDoc.submittedBy.email}
                      </Link>
                    ) : (
                      <span className="text-gray-500">Unknown</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-700">Created</dt>
                  <dd className="text-gray-900 mt-1">
                    {new Date(selectedDoc.createdAt).toLocaleString()}
                  </dd>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <Link
                  href={`/docs/${selectedDoc.id}/reader`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Document &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <div className="text-gray-500">Select a document to view details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
