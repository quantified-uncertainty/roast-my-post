"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Check, X, Lock } from "lucide-react";
import debounce from "lodash/debounce";

interface Document {
  id: string;
  title: string;
  authors?: string[];
  platforms?: string[];
  publishedDate?: string;
  url?: string;
  isPrivate?: boolean;
}

interface DocumentSearchProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  maxHeight?: string;
}

export function DocumentSearch({
  selectedIds,
  onChange,
  placeholder = "Search documents by title, author, or platform...",
  maxHeight = "max-h-96",
}: DocumentSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<Map<string, Document>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Initialize selected documents from search results if available
  useEffect(() => {
    if (documents.length > 0) {
      setSelectedDocuments(prevMap => {
        const newMap = new Map(prevMap);
        let hasChanges = false;
        
        documents.forEach(doc => {
          if (selectedIds.includes(doc.id) && !newMap.has(doc.id)) {
            newMap.set(doc.id, doc);
            hasChanges = true;
          }
        });
        
        return hasChanges ? newMap : prevMap;
      });
    }
  }, [documents, selectedIds]);

  // Create stable debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setDocuments([]);
        setHasSearched(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/documents/search?q=${encodeURIComponent(query)}&limit=20`
        );
        
        if (!response.ok) {
          throw new Error("Failed to search documents");
        }
        
        const data = await response.json();
        const searchResults = data.documents || [];
        
        setDocuments(searchResults);
        setHasSearched(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [] // Remove dependencies to make it stable
  );

  useEffect(() => {
    if (searchQuery.trim()) {
      debouncedSearch(searchQuery);
    } else {
      // Clear immediately when search is empty
      setDocuments([]);
      setHasSearched(false);
      setLoading(false);
    }
  }, [searchQuery, debouncedSearch]);

  const toggleDocument = (doc: Document) => {
    if (selectedIds.includes(doc.id)) {
      onChange(selectedIds.filter(id => id !== doc.id));
      // Remove from cache
      setSelectedDocuments(prev => {
        const newMap = new Map(prev);
        newMap.delete(doc.id);
        return newMap;
      });
    } else {
      onChange([...selectedIds, doc.id]);
      // Add to cache immediately
      setSelectedDocuments(prev => {
        const newMap = new Map(prev);
        newMap.set(doc.id, doc);
        return newMap;
      });
    }
  };

  const removeDocument = (docId: string) => {
    onChange(selectedIds.filter(id => id !== docId));
    setSelectedDocuments(prev => {
      const newMap = new Map(prev);
      newMap.delete(docId);
      return newMap;
    });
  };

  const clearSelection = () => {
    onChange([]);
    setSelectedDocuments(new Map());
  };

  const selectAll = () => {
    const allIds = documents.map(doc => doc.id);
    const newSelection = Array.from(new Set([...selectedIds, ...allIds]));
    onChange(newSelection);
    
    // Add all documents to cache
    setSelectedDocuments(prev => {
      const newMap = new Map(prev);
      documents.forEach(doc => newMap.set(doc.id, doc));
      return newMap;
    });
  };

  // Get selected documents in order - include placeholder for missing docs
  const selectedDocumentsList = selectedIds.map(id => {
    const doc = selectedDocuments.get(id);
    if (doc) return doc;
    // Return a placeholder document while we wait for the data
    return {
      id,
      title: "Loading...",
      authors: [],
      platforms: [],
    } as Document;
  });

  return (
    <div className="space-y-4">
      {/* Selected Documents Section */}
      {selectedIds.length > 0 && (
        <div className="rounded-md border border-purple-200 bg-purple-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-purple-900">
              Selected Documents ({selectedIds.length})
            </h4>
            <button
              type="button"
              onClick={clearSelection}
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-2">
            {selectedDocumentsList.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between bg-white rounded px-3 py-2 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-gray-900 truncate ${doc.title === "Loading..." ? "italic text-gray-400" : ""}`}>
                    {doc.title}
                    {doc.isPrivate && (
                      <Lock className="inline-block ml-1 h-3 w-3 text-gray-400" />
                    )}
                  </p>
                  {doc.title !== "Loading..." && (
                    <p className="text-xs text-gray-500">
                      {doc.authors && doc.authors.length > 0 && `by ${doc.authors.join(", ")}`}
                      {doc.platforms && doc.platforms.length > 0 && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {doc.platforms[0]}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeDocument(doc.id)}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                  title="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-purple-600" />
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Search Results */}
      {hasSearched && (
        <div className={`${maxHeight} overflow-y-auto rounded-md border border-gray-200`}>
          {documents.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">No documents found</p>
              <p className="mt-1 text-xs text-gray-400">
                Try different search terms or check your spelling
              </p>
            </div>
          ) : (
            <>
              {/* Select All Bar */}
              <div className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  Found {documents.length} documents
                </span>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-purple-600 hover:text-purple-700"
                >
                  Select all
                </button>
              </div>
              
              {/* Document List */}
              <div className="divide-y divide-gray-200">
                {documents.map((doc) => {
                  const isSelected = selectedIds.includes(doc.id);
                  return (
                    <label
                      key={doc.id}
                      className="flex cursor-pointer items-start gap-3 p-4 hover:bg-gray-50"
                    >
                      <div className="flex h-5 items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleDocument(doc)}
                          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {doc.title}
                          {doc.isPrivate && (
                            <span title="Private document">
                              <Lock className="inline-block ml-1 h-3 w-3 text-gray-400" />
                            </span>
                          )}
                        </p>
                        <div className="mt-1 text-xs text-gray-500 space-x-2">
                          {doc.authors && doc.authors.length > 0 && (
                            <span>by {doc.authors.join(", ")}</span>
                          )}
                          {doc.platforms && doc.platforms.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                              {doc.platforms[0]}
                            </span>
                          )}
                          {doc.publishedDate && (
                            <span>{new Date(doc.publishedDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-purple-600" />
                      )}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Initial State */}
      {!hasSearched && !loading && selectedIds.length === 0 && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-8 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            Search for documents to add to your experiment
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Start typing to search through all available documents
          </p>
        </div>
      )}
    </div>
  );
}