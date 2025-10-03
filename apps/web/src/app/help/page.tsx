import Link from "next/link";

import { EXTERNAL_URLS } from "@/shared/constants/constants";
import {
  BeakerIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  RocketLaunchIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

const documentationSections = [
  {
    title: "Getting Started",
    description: "Learn the basics of using Roast My Post",
    href: "/help/getting-started",
    icon: RocketLaunchIcon,
  },
  {
    title: "Evaluator Documentation for Humans",
    description: "Understanding and creating AI evaluators for document evaluation",
    href: "/help/evaluators-humans",
    icon: UserGroupIcon,
  },
  {
    title: "Evaluator Documentation for LLMs",
    description: "Technical specification for AI evaluators and their capabilities",
    href: "/help/evaluators-llms",
    icon: ChatBubbleLeftRightIcon,
  },
  {
    title: "API Documentation",
    description: "Complete API reference for developers",
    href: "/help/api",
    icon: CodeBracketIcon,
  },
  {
    title: "Ephemeral Experiments",
    description:
      "Create temporary experiments for testing evaluator configurations",
    href: "/help/ephemeral-experiments",
    icon: BeakerIcon,
  },
];

export default function HelpPage() {
  return (
    <div className="flex-1 bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Home
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Documentation</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {documentationSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.href}
                href={section.href}
                className="group relative rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div>
                  <span className="inline-flex rounded-lg bg-blue-50 p-3 text-blue-600 group-hover:bg-blue-100">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {section.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    {section.description}
                  </p>
                </div>
                <span
                  className="pointer-events-none absolute right-6 top-6 text-gray-300 group-hover:text-gray-400"
                  aria-hidden="true"
                >
                  <svg
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                  </svg>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Need More Help?
          </h2>
          <div className="mt-4 space-y-3">
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                • Join our{" "}
                <a
                  href={EXTERNAL_URLS.DISCORD}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Discord community
                </a>{" "}
                for chat support
              </li>
              <li>
                •{" "}
                <a
                  href={EXTERNAL_URLS.GITHUB_ISSUES}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Report issues
                </a>{" "}
                on GitHub
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
