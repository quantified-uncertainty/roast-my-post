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
      setError(err instanceof Error ? err.message : "Failed to import document");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Import Document</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700">
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
        
        {error && (
          <div className="text-red-600 text-sm">
            {error}
          </div>
        )}
        
        <Button 
          type="submit" 
          disabled={isLoading || !url.trim()}
          className="w-full"
        >
          {isLoading ? "Importing..." : "Import Document"}
        </Button>
      </form>
      
      <div className="mt-6 text-sm text-gray-600">
        <p>Supported platforms:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
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