"use client";

import { useState } from "react";
import { DocumentIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { DocumentSearch } from "@/components/DocumentSearch";

interface DocumentSelection {
  mode: 'search' | 'urls' | 'inline';
  documentIds: string[];
  urls: string[];
  inlineDocuments: Array<{
    title: string;
    content: string;
    author?: string;
  }>;
}

interface DocumentSelectionProps {
  selection: DocumentSelection;
  onChange: (selection: DocumentSelection) => void;
}

export function DocumentSelectionForm({ selection, onChange }: DocumentSelectionProps) {
  const [urlText, setUrlText] = useState(selection.urls.join('\n'));

  const handleUrlChange = (text: string) => {
    setUrlText(text);
    const urls = text.split('\n').filter(url => url.trim()).map(url => url.trim());
    onChange({ ...selection, urls });
  };

  const addInlineDocument = () => {
    onChange({
      ...selection,
      inlineDocuments: [
        ...selection.inlineDocuments,
        { title: '', content: '', author: '' },
      ],
    });
  };

  const updateInlineDocument = (index: number, field: string, value: string) => {
    const updated = [...selection.inlineDocuments];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...selection, inlineDocuments: updated });
  };

  const removeInlineDocument = (index: number) => {
    const updated = selection.inlineDocuments.filter((_, i) => i !== index);
    onChange({ ...selection, inlineDocuments: updated });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <DocumentIcon className="h-5 w-5 mr-2 text-gray-600" />
        Document Selection
      </h2>

      {/* Document Mode Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-4">
          <button
            onClick={() => onChange({ ...selection, mode: 'search' })}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selection.mode === 'search'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Search Existing
          </button>
          <button
            onClick={() => onChange({ ...selection, mode: 'urls' })}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selection.mode === 'urls'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Import URLs
          </button>
          <button
            onClick={() => onChange({ ...selection, mode: 'inline' })}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selection.mode === 'inline'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Paste Content
          </button>
        </nav>
      </div>

      {/* Document Selection Content */}
      {selection.mode === 'search' && (
        <DocumentSearch
          selectedIds={selection.documentIds}
          onChange={(ids) => onChange({ ...selection, documentIds: ids })}
        />
      )}

      {selection.mode === 'urls' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document URLs <span className="text-xs text-gray-500">(one per line)</span>
            </label>
            <textarea
              value={urlText}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://lesswrong.com/posts/abc123/example-post
https://forum.effectivealtruism.org/posts/xyz789/another-post
https://example.com/article"
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
            />
            <p className="mt-2 text-sm text-gray-500">
              Supported: LessWrong, EA Forum, and general web pages. 
              Documents will be imported when the experiment is created.
            </p>
          </div>
          {selection.urls.length > 0 && (
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-sm text-gray-700">
                {selection.urls.length} URL{selection.urls.length !== 1 ? 's' : ''} to import
              </p>
            </div>
          )}
        </div>
      )}

      {selection.mode === 'inline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Add documents by pasting content directly
            </p>
            <button
              onClick={addInlineDocument}
              className="inline-flex items-center px-3 py-1 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Document
            </button>
          </div>

          {selection.inlineDocuments.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                No documents added yet
              </p>
              <button
                onClick={addInlineDocument}
                className="mt-3 text-sm text-purple-600 hover:text-purple-700"
              >
                Add your first document
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {selection.inlineDocuments.map((doc, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h4 className="text-sm font-medium text-gray-700">
                      Document {index + 1}
                    </h4>
                    <button
                      onClick={() => removeInlineDocument(index)}
                      className="text-red-600 hover:text-red-700"
                      title="Remove document"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Document title"
                      value={doc.title}
                      onChange={(e) => updateInlineDocument(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Author <span className="text-xs text-gray-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Author name"
                      value={doc.author || ''}
                      onChange={(e) => updateInlineDocument(index, 'author', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      placeholder="Paste or type document content here..."
                      value={doc.content}
                      onChange={(e) => updateInlineDocument(index, 'content', e.target.value)}
                      className="w-full h-32 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}