"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  BarChart3,
  ChevronDown,
  Clock,
  Download,
  FileDown,
  FileText,
  Pencil,
  Play,
  Upload,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/constants/routes";

import { AgentIcon } from "@/components/AgentIcon";
import { Button } from "@/components/Button";
import { ExperimentalBadge } from "@/components/ExperimentalBadge";
import { AgentBadges } from "@/components/AgentBadges";

import type { AgentDetailProps } from "./types";
import {
  exportAgentAsJson,
  exportAgentAsMarkdown,
  exportAgentAsYaml,
} from "./utils";
import { useState } from "react";

export function AgentDetailLayout({
  agent,
  isOwner = false,
  isAdmin = false,
  children,
}: AgentDetailProps & { children: React.ReactNode }) {
  const pathname = usePathname();
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [exportType, setExportType] = useState<"JSON" | "Markdown" | "YAML">("JSON");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setExportDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setExportDropdownOpen]);

  const handleExportJson = () =>
    exportAgentAsJson(agent, setExportType, setCopySuccess);
  const handleExportMarkdown = () =>
    exportAgentAsMarkdown(agent, setExportType, setCopySuccess);
  const handleExportYaml = () =>
    exportAgentAsYaml(agent, setExportType, setCopySuccess);

  // Determine active tab from pathname using more robust segment matching
  const getActiveTab = () => {
    // Split pathname and get the last segment
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    
    // Check if the last segment is the agent ID (means we're on the overview page)
    if (lastSegment === agent.id) {
      return 'overview';
    }
    
    // Check if the last segment is a known tab
    const validTabs = ['details', 'evals', 'jobs', 'test', 'batches', 'export', 'versions'];
    if (validTabs.includes(lastSegment)) {
      return lastSegment;
    }
    
    // Default to overview if we're on the agent base path
    return 'overview';
  };

  const activeTab = getActiveTab();

  // Determine container styling based on active tab
  // Using full class strings so Tailwind can detect them
  const isWideView = activeTab === "jobs" || activeTab === "evals" || activeTab === "versions";
  const containerClassName = isWideView
    ? "w-full px-4 py-8 sm:px-6 lg:px-8"
    : "mx-auto max-w-6xl p-8";

  // Tab link component to reduce repetition
  const TabLink = ({ href, tabName, icon, label }: { 
    href: string; 
    tabName: string; 
    icon: React.ReactNode; 
    label: string;
  }) => {
    const isActive = activeTab === tabName;
    // Using full class strings for Tailwind to detect
    const linkClassName = isActive
      ? "inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium border-blue-500 text-blue-600"
      : "inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700";
    
    return (
      <Link href={href} className={linkClassName}>
        {icon}
        {label}
      </Link>
    );
  };

  return (
    <div className={containerClassName}>
      {/* Success Notification */}
      {copySuccess && (
        <div className="fixed right-4 top-4 z-50 rounded-md bg-green-50 p-4 shadow-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Evaluator {exportType} copied to clipboard!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex gap-4">
          <AgentIcon agentId={agent.id} size={64} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold transition-colors group-hover:text-blue-600">
                {agent.name}
              </h2>
              {agent.ephemeralBatch && (
                <ExperimentalBadge
                  trackingId={agent.ephemeralBatch.trackingId}
                  className="ml-2"
                />
              )}
            </div>
            <p className="text-sm text-gray-500">
              v{agent.version}
              {agent.owner && (
                <>
                  {" • "}
                  <Link
                    href={ROUTES.USERS.PROFILE(agent.owner.id)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    {agent.owner.name || "View Owner"}
                  </Link>
                </>
              )}
            </p>
            <div className="mt-2 flex gap-2">
              <AgentBadges
                isDeprecated={agent.isDeprecated}
                isRecommended={agent.isRecommended}
                isSystemManaged={agent.isSystemManaged}
                providesGrades={agent.providesGrades}
                size="md"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="secondary"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-4 w-4" />
            </Button>

            {exportDropdownOpen && (
              <div className="absolute right-0 z-10 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                <button
                  onClick={handleExportJson}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  JSON
                </button>
                <button
                  onClick={handleExportMarkdown}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Markdown
                </button>
                <button
                  onClick={handleExportYaml}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  YAML
                </button>
              </div>
            )}
          </div>

          {isOwner && (
            <>
              <Link href={ROUTES.AGENTS.IMPORT_YAML(agent.id)}>
                <Button variant="secondary" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
              </Link>
              <Link href={ROUTES.AGENTS.EDIT(agent.id)}>
                <Button variant="secondary" className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit Evaluator
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <TabLink
            href={ROUTES.AGENTS.DETAIL(agent.id)}
            tabName="overview"
            icon={<User className="mr-2 h-5 w-5" />}
            label="Overview"
          />
          <TabLink
            href={ROUTES.AGENTS.DETAILS(agent.id)}
            tabName="details"
            icon={<FileText className="mr-2 h-5 w-5" />}
            label="Details"
          />
          <TabLink
            href={ROUTES.AGENTS.VERSIONS(agent.id)}
            tabName="versions"
            icon={<Clock className="mr-2 h-5 w-5" />}
            label="Versions"
          />
          <TabLink
            href={ROUTES.AGENTS.EVALS(agent.id)}
            tabName="evals"
            icon={<BarChart3 className="mr-2 h-5 w-5" />}
            label="Evals"
          />
          {(isOwner || isAdmin) && (
            <Link
              href={ROUTES.AGENTS.JOBS(agent.id)}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === "jobs"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <Clock className="mr-2 h-5 w-5" />
              Jobs
            </Link>
          )}
          {isOwner && (
            <>
              <Link
                href={ROUTES.AGENTS.TEST(agent.id)}
                className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === "test"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <Play className="mr-2 h-5 w-5" />
                Test
              </Link>
              <Link
                href={ROUTES.AGENTS.BATCHES(agent.id)}
                className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === "batches"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <BarChart3 className="mr-2 h-5 w-5" />
                Batch Tests
              </Link>
            </>
          )}
          {(isOwner || isAdmin) && (
            <TabLink
              href={ROUTES.AGENTS.EXPORT(agent.id)}
              tabName="export"
              icon={<FileDown className="mr-2 h-5 w-5" />}
              label="Export"
            />
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {children}
      </div>
    </div>
  );
}