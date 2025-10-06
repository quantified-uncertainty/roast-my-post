"use client";

import { Bot, FileText, Users, Wrench, Home, BookOpen, Library, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import AuthHeader from "./AuthHeader";
import Footer from "./Footer";
import ProfileCheck from "./ProfileCheck";
import { Button } from "./ui/button";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isReaderPage = pathname?.includes("/reader");
  const { data: session } = useSession();
  const isLoggedIn = !!session;

  return (
    <div className="flex h-full flex-col">
      <ProfileCheck />
      {/* Header (always visible at the top) */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link
            href={isLoggedIn ? "/my-documents" : "/"}
            className="text-2xl font-bold text-gray-900 transition-colors hover:text-gray-700"
          >
            Roast My Post
          </Link>
          <div className="flex items-center justify-between space-x-6">
            <nav className="flex items-center space-x-6">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/my-documents"
                    className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
                  >
                    <Library className="h-5 w-5" />
                    My Docs
                  </Link>
                  <Button asChild size="sm" className="bg-black hover:bg-gray-800">
                    <Link href="/docs/new">
                      <Plus className="h-4 w-4" />
                      New Document
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    href="/docs"
                    className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
                  >
                    <BookOpen className="h-5 w-5" />
                    Explore
                  </Link>
                  <Link
                    href="/evaluators"
                    className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
                  >
                    <Bot className="h-5 w-5" />
                    Evaluators
                  </Link>
                  <Link
                    href="/tools"
                    className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
                  >
                    <Wrench className="h-5 w-5" />
                    Tools
                  </Link>
                </>
              )}
              <AuthHeader />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        {isReaderPage ? (
          children
        ) : (
          <div className="flex min-h-full flex-col">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        )}
      </main>
    </div>
  );
}
