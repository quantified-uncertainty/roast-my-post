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
      <header className="border-b border-gray-200 bg-blue-500 px-6 py-3 flex-shrink-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Roast My Post</h1>
          <div className="flex items-center justify-between space-x-6">
            <nav className="flex items-center space-x-6">
              <Link
                href="/docs"
                className="flex items-center gap-1 text-white hover:text-gray-200"
              >
                <DocumentTextIcon className="inline-block h-5 w-5 align-text-bottom" />
                Documents
              </Link>
              <Link
                href="/agents"
                className="flex items-center gap-1 text-white hover:text-gray-200"
              >
                <Bot className="inline-block h-5 w-5 align-text-bottom" />
                Agents
              </Link>
              <Link href="/users" className="text-white hover:text-gray-200">
                Users
              </Link>
              <Link
                href="/self-ranking"
                className="text-white hover:text-gray-200"
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
