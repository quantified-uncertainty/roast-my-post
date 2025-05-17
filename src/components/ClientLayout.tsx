"use client";

import Link from "next/link";

import AuthHeader from "./AuthHeader";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Header (always visible at the top) */}
      <header className="border-b border-gray-200 bg-blue-500 px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Roast My Post</h1>
          <div className="flex items-center justify-between space-x-6">
            <nav className="flex items-center space-x-6">
              <Link href="/" className="text-white hover:text-gray-200">
                Home
              </Link>
              <Link href="/docs" className="text-white hover:text-gray-200">
                Documents
              </Link>
              <Link href="/agents" className="text-white hover:text-gray-200">
                Agents
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
      <main>{children}</main>
    </>
  );
}
