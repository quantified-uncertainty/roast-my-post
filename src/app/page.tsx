"use client";

import Link from 'next/link';

import { evaluationAgents } from '@/data/agents/index';
import { getIcon } from '@/utils/iconMap';

export default function Home() {
  // Get a few featured agents
  const featuredAgents = evaluationAgents.slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Evaluation Oracle
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            AI-powered document review and evaluation tools
          </p>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Featured Evaluation Agents
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {featuredAgents.map((agent) => {
                  const IconComponent = getIcon(agent.iconName);
                  return (
                    <Link
                      key={agent.id}
                      href={`/agents/${agent.id}-${agent.version.replace(
                        ".",
                        "-"
                      )}`}
                      className="block group"
                    >
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 h-full transition-all duration-200 hover:shadow-md">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg bg-blue-100`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <h3 className="text-lg font-semibold group-hover:text-blue-600 transition-colors">
                            {agent.name}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {agent.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="text-center">
                <Link
                  href="/agents"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  View All Agents
                </Link>
              </div>
            </div>

            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Document Library
              </h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden p-6">
                <p className="mb-4 text-lg text-gray-700">
                  Browse our collection of research documents with interactive
                  review comments and annotations.
                </p>
                <Link
                  href="/docs"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Explore Documents
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
