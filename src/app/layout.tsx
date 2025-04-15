import "./globals.css";

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Open Annotate",
  description: "AI document review and analysis platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        {/* Header (always visible at the top) */}
        <header className="border-b border-gray-200 bg-blue-500 px-6 py-3">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Open Annotate</h1>
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
