"use client";

import { useState } from "react";

import { Button } from "@/components/Button";

import { importDocument } from "./actions";

export default function ImportPage() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await importDocument(url.trim());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import document"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Import Document</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="url"
            className="block text-sm font-medium text-gray-700"
          >
            URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            id="url"
            name="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            required
            disabled={isLoading}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <Button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="w-full"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
              Importing...
            </div>
          ) : (
            "Import Document"
          )}
        </Button>
      </form>

      {isLoading && (
        <div className="mt-4 text-center text-sm text-gray-600">
          Importing may take 10-20 seconds. Please be patient while we process
          your document.
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <p>Supported platforms:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>LessWrong</li>
          <li>EA Forum</li>
          <li>Medium</li>
          <li>Substack</li>
          <li>General web articles</li>
        </ul>
      </div>
    </div>
  );
}
