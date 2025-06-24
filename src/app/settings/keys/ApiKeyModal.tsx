"use client";

import { useEffect, useRef, useState } from "react";

import {
  CheckIcon,
  ClipboardIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface ApiKeyModalProps {
  onClose: () => void;
  onCreateKey: (name: string, expiresIn?: number) => Promise<void>;
  createdKey: { key: string; name: string } | null;
}

export function ApiKeyModal({
  onClose,
  onCreateKey,
  createdKey,
}: ApiKeyModalProps) {
  const [name, setName] = useState("");
  const [expiresIn, setExpiresIn] = useState<number | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await onCreateKey(name, expiresIn);
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75 p-4">
      <div ref={modalRef} className="w-full max-w-md rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {createdKey ? "API Key Created" : "Create API Key"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {createdKey ? (
          <div>
            <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">
                Save this API key securely. You won't be able to see it again.
              </p>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Name
              </label>
              <p className="text-sm text-gray-900">{createdKey.name}</p>
            </div>

            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                API Key
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={createdKey.key}
                  className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="mr-1 h-4 w-4 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <ClipboardIcon className="mr-1 h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mb-6 rounded-md bg-gray-50 p-4">
              <h4 className="mb-2 text-sm font-medium text-gray-900">
                Add to your MCP configuration:
              </h4>
              <pre className="overflow-x-auto rounded bg-gray-800 p-3 text-xs text-gray-100">
                {`{
  "mcpServers": {
    "open-annotate": {
      "env": {
        "DATABASE_URL": "your-database-url",
        "ROAST_MY_POST_MCP_USER_API_KEY": "${createdKey.key}"
      }
    }
  }
}`}
              </pre>
            </div>

            <button
              onClick={onClose}
              className="w-full rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Key Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., MCP Server Key"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="expires"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Expiration (optional)
              </label>
              <select
                id="expires"
                value={expiresIn || ""}
                onChange={(e) =>
                  setExpiresIn(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Never expires</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !name.trim()}
                className="flex-1 rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Create Key"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
