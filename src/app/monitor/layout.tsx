"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Metadata } from "next";

interface MonitorLayoutProps {
  children: React.ReactNode;
}

export default function MonitorLayout({ children }: MonitorLayoutProps) {
  const pathname = usePathname();

  const getLinkClass = (href: string) => {
    const isActive = pathname === href || (href === "/monitor" && pathname === "/monitor");
    return `font-medium transition-colors ${
      isActive 
        ? "text-blue-600 border-b-2 border-blue-600" 
        : "text-gray-600 hover:text-gray-900"
    }`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-8">
              <Link href="/monitor">
                <h1 className="text-2xl font-bold text-gray-900 hover:text-gray-700 cursor-pointer">
                  System Monitor
                </h1>
              </Link>
              <nav className="flex space-x-6">
                <Link
                  href="/monitor"
                  className={getLinkClass("/monitor")}
                >
                  Overview
                </Link>
                <Link
                  href="/monitor/jobs"
                  className={getLinkClass("/monitor/jobs")}
                >
                  Jobs
                </Link>
                <Link
                  href="/monitor/evals"
                  className={getLinkClass("/monitor/evals")}
                >
                  Evaluations
                </Link>
              </nav>
            </div>
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}