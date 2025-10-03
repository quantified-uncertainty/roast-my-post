"use client";

import { useState } from "react";
import { logger } from "@/infrastructure/logging/logger";

import {
  ArrowLeft,
  CheckCircle,
  Copy,
} from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import MARKDOWN_CONTENT from "./evaluator-schema-documentation.md";
import { ROUTES } from "@/constants/routes";

export function AgentSchemaDoc() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(MARKDOWN_CONTENT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/evaluators"
            className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Evaluators
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Evaluator Schema Documentation
              </h1>
              <p className="mt-2 text-xl text-gray-600">
                Complete guide to creating and configuring AI evaluators for
                document evaluation
              </p>
            </div>
            <button
              onClick={copyToClipboard}
              className="ml-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy as Markdown"}
            </button>
          </div>
        </div>

        {/* Copy Instructions */}
        <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="mb-3 text-lg font-semibold text-blue-900">
            📋 Copy as Markdown
          </h2>
          <p className="mb-4 text-blue-800">
            This documentation is designed to be copied as markdown and provided
            to LLMs for evaluator creation assistance. Click the "Copy as Markdown"
            button above to get the full documentation in markdown format.
          </p>
          <div className="text-sm text-blue-700">
            <strong>Use Case:</strong> Paste this documentation into Claude,
            ChatGPT, or other LLMs along with your specific requirements to get
            help creating well-structured evaluators.
          </div>
        </div>

        {/* Full Documentation */}
        <div className="rounded-lg border border-gray-200 bg-white p-8">
          <div className="prose max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {MARKDOWN_CONTENT}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-gray-200 pt-8 text-center text-gray-500">
          <p>
            Need help creating an evaluator? Use the{" "}
            <Link
              href={ROUTES.AGENTS.NEW}
              className="text-blue-600 hover:text-blue-800"
            >
              Evaluator Creator
            </Link>{" "}
            or{" "}
            <Link href={ROUTES.AGENTS.LIST} className="text-blue-600 hover:text-blue-800">
              Import
            </Link>{" "}
            an existing configuration.
          </p>
        </div>
      </div>
    </div>
  );
}
