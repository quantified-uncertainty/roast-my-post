"use client";

import { Bot } from "lucide-react";
import Link from "next/link";

import { DocumentTextIcon } from "@heroicons/react/24/outline";

import AuthHeader from "./AuthHeader";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Header (always visible at the top) */}
      <header className="border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Roast My Post</h1>
          <div className="flex items-center justify-between space-x-6">
            <nav className="flex items-center space-x-6">
              <Link
                href="/docs"
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
              >
                <DocumentTextIcon className="inline-block h-5 w-5 align-text-bottom" />
                Documents
              </Link>
              <Link
                href="/agents"
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
              >
                <Bot className="inline-block h-5 w-5 align-text-bottom" />
                Agents
              </Link>
              <Link href="/users" className="text-gray-600 hover:text-gray-900">
                Users
              </Link>
              <Link
                href="/self-ranking"
                className="text-gray-600 hover:text-gray-900"
              >
                Self-Ranking
              </Link>
              <AuthHeader />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
