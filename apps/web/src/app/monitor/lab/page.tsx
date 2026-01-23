"use client";

import { useState, useCallback } from "react";
import { useBaselines } from "./hooks/useBaselines";
import { useRuns } from "./hooks/useRuns";
import { useProfiles, getActiveProfile } from "./hooks/useProfiles";
import { useAllEvaluations } from "./hooks/useAllEvaluations";
import type { Baseline, Profile, ProfileConfig } from "./types";
import { formatDate } from "./utils/formatters";
import { PlusIcon, PlayIcon, ArrowPathIcon, TrashIcon, BeakerIcon, CpuChipIcon, DocumentMagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { CreateBaselineModal } from "./components/baselines/CreateBaselineModal";
import { RunDetail } from "./components/history/RunDetail";
import { ProfilesList } from "./components/profiles/ProfilesList";
import { ProfileDetailView } from "./components/profiles/ProfileDetailView";
import { AllEvaluationsList } from "./components/evaluations/AllEvaluationsList";

type SidebarTab = "baselines" | "profiles" | "evaluations";

interface RunProgress {
  phase: "idle" | "starting" | "running" | "comparing" | "done" | "error";
  message: string;
  completed: number;
  total: number;
}

const AGENT_ID = "system-fallacy-check";

function getDefaultRunName(): string {
  const now = new Date();
  return `Run ${now.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}

export default function LabPage() {
  const { baselines, loading: baselinesLoading, refresh: refreshBaselines, deleteBaseline } = useBaselines(AGENT_ID);
  const { profiles, loading: profilesLoading, deleteProfile, setDefault: setDefaultProfile, updateProfile, createProfile } = useProfiles(AGENT_ID);
  const { evaluations, loading: evaluationsLoading, error: evaluationsError, refresh: refreshEvaluations } = useAllEvaluations(AGENT_ID);

  // Sidebar tab state
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("baselines");

  // Baselines state
  const [selectedBaseline, setSelectedBaseline] = useState<Baseline | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  // Profiles tab state
  const [selectedProfileForEdit, setSelectedProfileForEdit] = useState<Profile | null>(null);

  // Get active profile
  const activeProfile = getActiveProfile(profiles, selectedProfileId);

  // Run state
  const [runName, setRunName] = useState(getDefaultRunName);
  const [runProgress, setRunProgress] = useState<RunProgress>({
    phase: "idle",
    message: "",
    completed: 0,
    total: 0,
  });

  // Get runs for selected baseline
  const { runs, loading: runsLoading, refresh: refreshRuns } = useRuns(selectedBaseline?.id ?? null);

  const pollJobStatus = useCallback(async (jobIds: string[]): Promise<boolean> => {
    const res = await fetch(`/api/monitor/lab/jobs/status?jobIds=${jobIds.join(",")}`);
    if (!res.ok) throw new Error("Failed to check job status");
    const data = await res.json();
    setRunProgress((p) => ({
      ...p,
      completed: data.summary.completed + data.summary.failed,
      total: data.summary.total,
      message: `${data.summary.completed} completed, ${data.summary.running} running, ${data.summary.pending} pending`,
    }));
    return data.summary.allDone;
  }, []);

  const startRun = async () => {
    if (!selectedBaseline) return;

    setRunProgress({ phase: "starting", message: "Creating validation run...", completed: 0, total: 0 });

    try {
      const startRes = await fetch("/api/monitor/lab/runs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baselineId: selectedBaseline.id,
          name: runName || undefined,
          profileId: activeProfile?.id,
        }),
      });

      if (!startRes.ok) {
        const err = await startRes.json();
        throw new Error(err.error || "Failed to start run");
      }

      const startData = await startRes.json();
      const runId = startData.run.id;
      const { jobIds } = startData;

      setRunProgress({
        phase: "running",
        message: `Evaluating ${jobIds.length} documents...`,
        completed: 0,
        total: jobIds.length,
      });

      // Poll for completion
      const maxWaitMs = 10 * 60 * 1000;
      const pollIntervalMs = 3000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitMs) {
        const allDone = await pollJobStatus(jobIds);
        if (allDone) break;
        await new Promise((r) => setTimeout(r, pollIntervalMs));
      }

      setRunProgress((p) => ({ ...p, phase: "comparing", message: "Comparing results..." }));

      const finalizeRes = await fetch(`/api/monitor/lab/runs/${runId}/finalize`, { method: "POST" });
      if (!finalizeRes.ok) {
        const err = await finalizeRes.json();
        throw new Error(err.error || "Failed to finalize run");
      }

      const finalizeData = await finalizeRes.json();
      setRunProgress({
        phase: "done",
        message: finalizeData.summary,
        completed: finalizeData.unchangedCount + finalizeData.changedCount,
        total: finalizeData.unchangedCount + finalizeData.changedCount,
      });

      setRunName(getDefaultRunName());
      void refreshRuns();
    } catch (error) {
      setRunProgress((p) => ({
        ...p,
        phase: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  };

  const isRunning = runProgress.phase === "starting" || runProgress.phase === "running" || runProgress.phase === "comparing";
  const progressPercent = runProgress.total > 0 ? Math.round((runProgress.completed / runProgress.total) * 100) : 0;

  const handleBaselineCreated = () => {
    setShowCreateModal(false);
    void refreshBaselines();
  };

  const handleDeleteBaseline = async (id: string) => {
    if (!confirm("Delete this baseline?")) return;
    await deleteBaseline(id);
    if (selectedBaseline?.id === id) {
      setSelectedBaseline(null);
    }
  };

  // Handle saving profile from ProfileDetailView
  const handleSaveProfile = async (updates: { name?: string; description?: string; config?: ProfileConfig }) => {
    if (!selectedProfileForEdit) return;
    await updateProfile(selectedProfileForEdit.id, updates);
    // Update local state with the new values
    setSelectedProfileForEdit((prev) =>
      prev
        ? {
            ...prev,
            name: updates.name || prev.name,
            description: updates.description ?? prev.description,
            config: updates.config || prev.config,
          }
        : null
    );
  };

  // Create a new profile and select it for editing
  const handleCreateProfile = async () => {
    const existingNames = profiles.map((p) => p.name);
    // Generate a descriptive name with date
    const now = new Date();
    let name = `Profile ${now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
    let counter = 1;
    while (existingNames.includes(name)) {
      counter++;
      name = `Profile ${now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })} (${counter})`;
    }

    try {
      const newProfile = await createProfile(name, "");
      setSelectedProfileForEdit(newProfile);
    } catch (error) {
      console.error("Failed to create profile:", error);
      alert("Failed to create profile");
    }
  };

  return (
    <div className="h-full flex">
      {/* Left Sidebar */}
      <div className="w-72 border-r bg-gray-50 flex flex-col">
        {/* Sidebar Tabs */}
        <div className="flex border-b bg-white">
          <button
            onClick={() => {
              setSidebarTab("baselines");
              setSelectedProfileForEdit(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              sidebarTab === "baselines"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <BeakerIcon className="h-4 w-4 flex-shrink-0" />
            Baselines
          </button>
          <button
            onClick={() => {
              setSidebarTab("profiles");
              setSelectedBaseline(null);
              setExpandedRun(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              sidebarTab === "profiles"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <CpuChipIcon className="h-4 w-4 flex-shrink-0" />
            Profiles
          </button>
          <button
            onClick={() => {
              setSidebarTab("evaluations");
              setSelectedBaseline(null);
              setExpandedRun(null);
              setSelectedProfileForEdit(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              sidebarTab === "evaluations"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <DocumentMagnifyingGlassIcon className="h-4 w-4 flex-shrink-0" />
            Evals
          </button>
        </div>

        {/* Sidebar Content */}
        {sidebarTab === "baselines" ? (
          <>
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-gray-900">Baselines</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  title="Create baseline"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500">Select a baseline to run validation</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {baselinesLoading ? (
                <div className="p-4 text-gray-500 text-sm">Loading...</div>
              ) : baselines.length === 0 ? (
                <div className="p-4 text-gray-500 text-sm">No baselines yet</div>
              ) : (
                <div className="divide-y">
                  {baselines.map((baseline) => (
                    <div
                      key={baseline.id}
                      onClick={() => {
                        setSelectedBaseline(baseline);
                        setExpandedRun(null);
                      }}
                      className={`p-3 cursor-pointer hover:bg-gray-100 ${
                        selectedBaseline?.id === baseline.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{baseline.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {baseline.snapshotCount} docs · {formatDate(baseline.createdAt)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteBaseline(baseline.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : sidebarTab === "profiles" ? (
          <ProfilesList
            profiles={profiles}
            loading={profilesLoading}
            selectedProfile={selectedProfileForEdit}
            onSelectProfile={setSelectedProfileForEdit}
            onCreateProfile={() => void handleCreateProfile()}
            onDeleteProfile={(id) => void deleteProfile(id)}
            onSetDefault={(id) => void setDefaultProfile(id)}
          />
        ) : (
          /* Evaluations tab - sidebar info */
          <div className="p-4">
            <h2 className="font-semibold text-gray-900 mb-2">All Evaluations</h2>
            <p className="text-xs text-gray-500">
              View telemetry from all user-facing evaluations, not just validation runs.
            </p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Evaluations Tab Main Content */}
        {sidebarTab === "evaluations" ? (
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <AllEvaluationsList
              evaluations={evaluations}
              loading={evaluationsLoading}
              error={evaluationsError}
              onRefresh={() => void refreshEvaluations()}
            />
          </div>
        ) : /* Profiles Tab Main Content */
        sidebarTab === "profiles" ? (
          selectedProfileForEdit ? (
            <ProfileDetailView profile={selectedProfileForEdit} onSave={handleSaveProfile} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <CpuChipIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Select a profile to view or edit</p>
                <p className="text-sm mt-1">or create a new one</p>
                <button
                  onClick={() => void handleCreateProfile()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Profile
                </button>
              </div>
            </div>
          )
        ) : !selectedBaseline ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BeakerIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Select a baseline to get started</p>
              <p className="text-sm mt-1">or create a new one</p>
            </div>
          </div>
        ) : (
          <>
            {/* Run Controls Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{selectedBaseline.name}</h1>
                  <p className="text-sm text-gray-500">
                    {selectedBaseline.snapshotCount} documents · Created {formatDate(selectedBaseline.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Profile Selector */}
                  <div className="flex items-center gap-1">
                    <select
                      value={selectedProfileId || activeProfile?.id || ""}
                      onChange={(e) => setSelectedProfileId(e.target.value || null)}
                      disabled={isRunning || profilesLoading}
                      className="px-3 py-2 border rounded-md text-sm disabled:bg-gray-100"
                    >
                      {profilesLoading ? (
                        <option>Loading...</option>
                      ) : profiles.length === 0 ? (
                        <option value="">Default config</option>
                      ) : (
                        profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}{p.isDefault ? " (default)" : ""}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <input
                    type="text"
                    value={runName}
                    onChange={(e) => setRunName(e.target.value)}
                    placeholder="Run name (optional)"
                    disabled={isRunning}
                    className="px-3 py-2 border rounded-md text-sm w-48 disabled:bg-gray-100"
                  />
                  <button
                    onClick={() => void startRun()}
                    disabled={isRunning}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRunning ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <PlayIcon className="h-4 w-4" />
                    )}
                    <span>{isRunning ? "Running..." : "Run Validation"}</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {runProgress.phase !== "idle" && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={`font-medium ${
                      runProgress.phase === "done" ? "text-green-600" :
                      runProgress.phase === "error" ? "text-red-600" : "text-blue-600"
                    }`}>
                      {runProgress.phase === "starting" && "Starting..."}
                      {runProgress.phase === "running" && "Running evaluations"}
                      {runProgress.phase === "comparing" && "Comparing results"}
                      {runProgress.phase === "done" && "Complete"}
                      {runProgress.phase === "error" && "Error"}
                    </span>
                    <span className="text-gray-500">{runProgress.message}</span>
                  </div>
                  {(runProgress.phase === "running" || runProgress.phase === "comparing") && (
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Run History */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <h2 className="font-semibold text-gray-900 mb-3">Run History</h2>
              {runsLoading ? (
                <div className="text-gray-500 text-sm">Loading runs...</div>
              ) : runs.length === 0 ? (
                <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
                  <p>No runs yet for this baseline</p>
                  <p className="text-sm mt-1">Click "Run Validation" to start</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {runs.map((run) => (
                    <div key={run.id} className="bg-white rounded-lg border overflow-hidden">
                      <div
                        onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                        className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{run.name}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {formatDate(run.createdAt)} · {run.summary || run.status}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <RunStatusBadge status={run.status} />
                          <span className="text-gray-400">{expandedRun === run.id ? "▼" : "▶"}</span>
                        </div>
                      </div>
                      {expandedRun === run.id && (
                        <div className="border-t">
                          <RunDetail runId={run.id} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Baseline Modal */}
      {showCreateModal && (
        <CreateBaselineModal
          agentId={AGENT_ID}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleBaselineCreated}
        />
      )}
    </div>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  const styles = {
    completed: "bg-green-100 text-green-800",
    running: "bg-blue-100 text-blue-800",
    failed: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
      {status}
    </span>
  );
}
