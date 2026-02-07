"use client";

import Link from "next/link";
import { BeakerIcon, CpuChipIcon } from "@heroicons/react/24/outline";

export default function LabSelectionPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Lab</h1>
        <p className="text-gray-600 mt-1">
          Experiment with analysis configurations and test different approaches
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fallacy Checker Lab */}
        <Link
          href="/monitor/lab/fallacy"
          className="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <BeakerIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Fallacy Checker Lab</h2>
              <p className="text-sm text-gray-500">Multi-extractor pipeline</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm">
            Configure and test the fallacy checker with multiple extractors,
            judge models, and filter chains. Compare runs against baselines.
          </p>
        </Link>

        {/* Agentic Lab */}
        <Link
          href="/monitor/lab/agentic"
          className="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CpuChipIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Agentic Lab</h2>
              <p className="text-sm text-gray-500">Claude Agent SDK</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm">
            Test agentic document analysis with web search, multi-agent orchestration,
            and MCP evaluation tools. Stream results in real-time.
          </p>
        </Link>
      </div>
    </div>
  );
}
