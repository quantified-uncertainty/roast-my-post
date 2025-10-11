"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BeakerIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  RocketLaunchIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

const navigation = [
  { name: "Documentation Hub", href: "/help", icon: Squares2X2Icon },
  {
    name: "Getting Started",
    href: "/help/getting-started",
    icon: RocketLaunchIcon,
  },
  {
    name: "Evaluators for Humans",
    href: "/help/evaluators-humans",
    icon: UserGroupIcon,
  },
  {
    name: "Evaluators for LLMs",
    href: "/help/evaluators-llms",
    icon: ChatBubbleLeftRightIcon,
  },
  {
    name: "Custom Evaluator Experiments",
    href: "/help/ephemeral-experiments",
    icon: BeakerIcon,
  },
  {
    name: "Claim Evaluations",
    href: "/help/claim-evaluations",
    icon: BeakerIcon,
  },
  { name: "API Documentation", href: "/help/api", icon: CodeBracketIcon },
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
    <div className="flex flex-1 bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <div className="sticky top-0 h-full overflow-y-auto bg-white shadow-sm">
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
      </div>

      {/* Main content */}
      <div className="flex-1">
        <main className="py-8">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
