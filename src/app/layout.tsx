import "./globals.css";

import Link from "next/link";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Document Analysis Platform",
  description: "Research document review and analysis platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* Header (always visible at the top) */}
        <header className="border-b border-gray-200 px-6 py-3 bg-blue-500">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">
              Document Analyzer
            </h1>
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
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main>{children}</main>
      </body>
    </html>
  );
}
