import Link from "next/link";
import { 
  BookOpenIcon, 
  CodeBracketIcon, 
  UserGroupIcon, 
  RocketLaunchIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon
} from "@heroicons/react/24/outline";

const documentationSections = [
  {
    title: "Getting Started",
    description: "Learn the basics of using Roast My Post",
    href: "/help/getting-started",
    icon: RocketLaunchIcon,
  },
  {
    title: "Agent Documentation for Humans",
    description: "Understanding and creating AI agents for document evaluation",
    href: "/help/agents-humans",
    icon: UserGroupIcon,
  },
  {
    title: "Agent Documentation for LLMs",
    description: "Technical specification for AI agents and their capabilities",
    href: "/help/agents-llms",
    icon: ChatBubbleLeftRightIcon,
  },
  {
    title: "API Documentation",
    description: "Complete API reference for developers",
    href: "/help/api",
    icon: CodeBracketIcon,
  },
  {
    title: "Roadmap",
    description: "See what's coming next for Roast My Post",
    href: "/help/roadmap",
    icon: DocumentTextIcon,
  },
];

export default function HelpPage() {
  return (
    <div className="flex-1 bg-gray-50 py-8 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Documentation</h1>
          <p className="mt-2 text-lg text-gray-600">
            Everything you need to know about using Roast My Post
          </p>
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
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                  </svg>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Need More Help?</h2>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-gray-600">
              Can't find what you're looking for? We're here to help:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Join our <a href="https://discord.gg/nsTmQqHRnV" className="text-blue-600 hover:text-blue-800">Discord community</a> for real-time support</li>
              <li>• Email us at <a href="mailto:contact@quantifieduncertainty.org" className="text-blue-600 hover:text-blue-800">contact@quantifieduncertainty.org</a></li>
              <li>• <a href="https://github.com/quantified-uncertainty/roast-my-post/issues" className="text-blue-600 hover:text-blue-800">Report issues</a> on GitHub</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}