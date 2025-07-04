"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BookOpenIcon, 
  CodeBracketIcon, 
  UserGroupIcon, 
  RocketLaunchIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  Squares2X2Icon
} from "@heroicons/react/24/outline";

const navigation = [
  { name: "Documentation Hub", href: "/help", icon: Squares2X2Icon },
  { name: "Getting Started", href: "/help/getting-started", icon: RocketLaunchIcon },
  { name: "Agents for Humans", href: "/help/agents-humans", icon: UserGroupIcon },
  { name: "Agents for LLMs", href: "/help/agents-llms", icon: ChatBubbleLeftRightIcon },
  { name: "API Documentation", href: "/help/api", icon: CodeBracketIcon },
  { name: "Roadmap", href: "/help/roadmap", icon: DocumentTextIcon },
];

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Don't show sidebar on the main help page
  if (pathname === "/help") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="sticky top-0 h-screen w-64 overflow-y-auto bg-white shadow-sm">
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center px-4">
              <Link href="/" className="text-lg font-semibold text-gray-900">
                Roast My Post
              </Link>
            </div>
            <nav className="flex-1 space-y-1 px-2 pb-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon
                      className={`mr-3 h-5 w-5 flex-shrink-0 ${
                        isActive
                          ? "text-blue-600"
                          : "text-gray-400 group-hover:text-gray-500"
                      }`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 pl-64">
          <main className="py-8">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}