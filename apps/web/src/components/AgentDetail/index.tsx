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
import { ROUTES } from "@/constants/routes";

import { Button } from "@/components/Button";
import { ExperimentalBadge } from "@/components/ExperimentalBadge";
import { AgentBadges } from "@/components/AgentBadges";

import { useAgentDetail } from "./hooks";
import {
  BatchesTab,
  DetailsTab,
  EvaluationsTab,
  ExportTab,
  JobsTab,
  OverviewTab,
  TestTab,
} from "./tabs";
import type { AgentDetailProps } from "./types";
import {
  exportAgentAsJson,
  exportAgentAsMarkdown,
  exportAgentAsYaml,
} from "./utils";

interface TabButtonProps {
  tabName: string;
  activeTab: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ tabName, activeTab, onClick, icon, label }: TabButtonProps) {
  const isActive = activeTab === tabName;
  const buttonClassName = isActive
    ? "inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium border-blue-500 text-blue-600"
    : "inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700";
  
  return (
    <button onClick={onClick} className={buttonClassName}>
      {icon}
      {label}
    </button>
  );
}

export default function AgentDetail({
  agent,
  isOwner = false,
  isAdmin = false,
}: AgentDetailProps) {
  const {
    activeTab,
    setActiveTab,
    review,
    documents,
    evaluations,
    selectedEvaluation,
    setSelectedEvaluation,
    evalDetailsTab,
    setEvalDetailsTab,
    loading,
    documentsLoading,
    evalsLoading,
    selectedVersion,
    setSelectedVersion,
    exportDropdownOpen,
    setExportDropdownOpen,
    copySuccess,
    setCopySuccess,
    exportType,
    setExportType,
    testLoading,
    setTestLoading,
    testSuccess,
    setTestSuccess,
    batches,
    setBatches,
    batchesLoading,
    jobs,
    jobsLoading,
    selectedBatchFilter,
    setSelectedBatchFilter,
    selectedJob,
    setSelectedJob,
    evalsBatchFilter,
    setEvalsBatchFilter,
    exportBatchFilter,
    setExportBatchFilter,
    overviewStats,
    overviewLoading,
    fetchBatches,
    fetchJobs,
    fetchEvaluations,
  } = useAgentDetail(agent);

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

  return (
    <div
      className={
        activeTab === "jobs" || activeTab === "evals"
          ? "w-full px-4 py-8 sm:px-6 lg:px-8"
          : "mx-auto max-w-6xl p-8"
      }
    >
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
      <div className="mb-8 flex items-center justify-between">
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

          <Link href={ROUTES.AGENTS.VERSIONS(agent.id)}>
            <Button variant="secondary" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Version History
            </Button>
          </Link>
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
          <TabButton
            tabName="overview"
            activeTab={activeTab}
            onClick={() => setActiveTab("overview")}
            icon={<User className="mr-2 h-5 w-5" />}
            label="Overview"
          />
          <TabButton
            tabName="details"
            activeTab={activeTab}
            onClick={() => setActiveTab("details")}
            icon={<FileText className="mr-2 h-5 w-5" />}
            label="Details"
          />
          <TabButton
            tabName="evals"
            activeTab={activeTab}
            onClick={() => {
              setActiveTab("evals");
              setEvalsBatchFilter(null);
            }}
            icon={<BarChart3 className="mr-2 h-5 w-5" />}
            label="Evals"
          />
          {(isOwner || isAdmin) && (
            <TabButton
              tabName="jobs"
              activeTab={activeTab}
              onClick={() => {
                setActiveTab("jobs");
                setSelectedBatchFilter(null);
              }}
              icon={<Clock className="mr-2 h-5 w-5" />}
              label="Jobs"
            />
          )}
          {isOwner && (
            <>
              <TabButton
                tabName="test"
                activeTab={activeTab}
                onClick={() => setActiveTab("test")}
                icon={<Play className="mr-2 h-5 w-5" />}
                label="Test"
              />
              <TabButton
                tabName="batches"
                activeTab={activeTab}
                onClick={() => setActiveTab("batches")}
                icon={<BarChart3 className="mr-2 h-5 w-5" />}
                label="Batch Tests"
              />
            </>
          )}
          {(isOwner || isAdmin) && (
            <TabButton
              tabName="export"
              activeTab={activeTab}
              onClick={() => {
                setActiveTab("export");
                setExportBatchFilter(null);
              }}
              icon={<FileDown className="mr-2 h-5 w-5" />}
              label="Export"
            />
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === "overview" && (
          <OverviewTab
            agent={agent}
            overviewStats={overviewStats}
            overviewLoading={overviewLoading}
          />
        )}

        {activeTab === "details" && <DetailsTab agent={agent} />}

        {activeTab === "evals" && (
          <EvaluationsTab
            agent={agent}
            evaluations={evaluations}
            evalsLoading={evalsLoading}
            selectedEvaluation={selectedEvaluation}
            setSelectedEvaluation={setSelectedEvaluation}
            evalDetailsTab={evalDetailsTab}
            setEvalDetailsTab={setEvalDetailsTab}
            selectedVersion={selectedVersion}
            setSelectedVersion={setSelectedVersion}
            evalsBatchFilter={evalsBatchFilter}
            setEvalsBatchFilter={setEvalsBatchFilter}
            batches={batches}
            fetchEvaluations={fetchEvaluations}
          />
        )}

        {activeTab === "jobs" && (isOwner || isAdmin) && (
          <JobsTab
            jobs={jobs}
            jobsLoading={jobsLoading}
            selectedJob={selectedJob}
            setSelectedJob={setSelectedJob}
            selectedBatchFilter={selectedBatchFilter}
            setSelectedBatchFilter={setSelectedBatchFilter}
            batches={batches}
            fetchJobs={fetchJobs}
          />
        )}

        {activeTab === "test" && isOwner && (
          <TestTab
            agent={agent}
            testLoading={testLoading}
            testSuccess={testSuccess}
            setTestLoading={setTestLoading}
            setTestSuccess={setTestSuccess}
            setActiveTab={setActiveTab}
            setBatches={setBatches}
            fetchBatches={fetchBatches}
          />
        )}

        {activeTab === "batches" && isOwner && (
          <BatchesTab
            batches={batches}
            batchesLoading={batchesLoading}
            setActiveTab={setActiveTab}
            setSelectedBatchFilter={setSelectedBatchFilter}
            setEvalsBatchFilter={setEvalsBatchFilter}
            setExportBatchFilter={setExportBatchFilter}
          />
        )}

        {activeTab === "export" && (isOwner || isAdmin) && (
          <ExportTab
            agent={agent}
            exportBatchFilter={exportBatchFilter}
            setExportBatchFilter={setExportBatchFilter}
            batches={batches}
          />
        )}
      </div>
    </div>
  );
}
