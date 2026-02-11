"use client";

import { useState } from "react";
import { useAgenticStream } from "./hooks/useAgenticStream";
import { useProfiles, getActiveProfile } from "../hooks/useProfiles";
import { useAgenticEvaluations } from "./hooks/useAgenticEvaluations";
import { ActivityFeed } from "./components/ActivityFeed";
import { ResultsPanel } from "./components/ResultsPanel";
import { DocumentPickerModal } from "./components/DocumentPickerModal";
import { ProfileEditor } from "./components/ProfileEditor";
import { EvaluationsList } from "./components/EvaluationsList";
import { ProfilesList } from "../components/profiles/ProfilesList";
import type { Profile } from "../types";
import {
  PlayIcon,
  CpuChipIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface SelectedDoc {
  id: string;
  title: string;
}

type SidebarTab = "run" | "history" | "profiles";

const AGENT_ID = "system-agentic";

export default function AgenticPage() {
  const [selectedDoc, setSelectedDoc] = useState<SelectedDoc | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("run");
  const [selectedProfileForEdit, setSelectedProfileForEdit] = useState<Profile | null>(null);

  const stream = useAgenticStream();
  const { profiles, loading: profilesLoading, createProfile, updateProfile, deleteProfile, setDefault: setDefaultProfile, duplicateProfile } = useProfiles(AGENT_ID, "agentic");
  const { evaluations, loading: evalsLoading, error: evalsError, refresh: refreshEvals } = useAgenticEvaluations();

  const activeProfile = getActiveProfile(profiles, selectedProfileId);

  const handleRun = async () => {
    if (!selectedDoc) return;
    await stream.start(selectedDoc.id, activeProfile?.id);
    // Refresh evaluations after run completes
    setTimeout(() => {
      void refreshEvals();
    }, 1000);
  };

  const handleCreateProfile = async () => {
    try {
      const profile = await createProfile(
        `Profile ${new Date().toLocaleString()}`,
        "Agentic analysis profile"
      );
      setSelectedProfileId(profile.id);
      setSelectedProfileForEdit(profile as Profile);
    } catch (err) {
      console.error("Failed to create profile:", err);
    }
  };

  const handleSaveConfig = async (config: Record<string, unknown>) => {
    const profileToSave = sidebarTab === "profiles" ? selectedProfileForEdit : activeProfile;
    if (!profileToSave) return;
    setSaving(true);
    try {
      const updated = await updateProfile(profileToSave.id, { config } as never);
      if (sidebarTab === "profiles") {
        setSelectedProfileForEdit(updated as Profile);
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async (profileId?: string) => {
    const idToDelete = profileId ?? activeProfile?.id;
    if (!idToDelete) return;
    try {
      await deleteProfile(idToDelete);
      if (selectedProfileForEdit?.id === idToDelete) {
        setSelectedProfileForEdit(null);
      }
      if (selectedProfileId === idToDelete) {
        setSelectedProfileId(null);
      }
    } catch (err) {
      console.error("Failed to delete profile:", err);
    }
  };

  const handleRenameProfile = async (profileId: string, newName: string) => {
    try {
      const updated = await updateProfile(profileId, { name: newName } as never);
      if (selectedProfileForEdit?.id === profileId) {
        setSelectedProfileForEdit(updated as Profile);
      }
    } catch (err) {
      console.error("Failed to rename profile:", err);
    }
  };

  const handleDuplicateProfile = async (profile: Profile) => {
    try {
      const duplicated = await duplicateProfile(profile);
      setSelectedProfileForEdit(duplicated as Profile);
    } catch (err) {
      console.error("Failed to duplicate profile:", err);
    }
  };

  return (
    <div className="h-[calc(100vh-13rem)] flex">
      {/* Left Sidebar */}
      <div className="w-72 border-r bg-gray-50 flex flex-col">
        {/* Sidebar Tabs */}
        <div className="flex border-b bg-white">
          <button
            onClick={() => setSidebarTab("run")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              sidebarTab === "run"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <PlayIcon className="h-4 w-4 flex-shrink-0" />
            Run
          </button>
          <button
            onClick={() => setSidebarTab("history")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              sidebarTab === "history"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <ClockIcon className="h-4 w-4 flex-shrink-0" />
            History
          </button>
          <button
            onClick={() => setSidebarTab("profiles")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              sidebarTab === "profiles"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <CpuChipIcon className="h-4 w-4 flex-shrink-0" />
            Profiles
          </button>
        </div>

        {/* Sidebar Content */}
        {sidebarTab === "run" && (
          <div className="p-4 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900 mb-2">Run Analysis</h2>
              <p className="text-xs text-gray-500">Select a document and profile to run agentic analysis.</p>
            </div>

            {/* Document selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document</label>
              <button
                onClick={() => setShowPicker(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors truncate"
              >
                {selectedDoc ? selectedDoc.title : "Select Document..."}
              </button>
              {selectedDoc && (
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="mt-1 text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear selection
                </button>
              )}
            </div>

            {/* Profile selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profile</label>
              <select
                value={activeProfile?.id ?? ""}
                onChange={(e) => setSelectedProfileId(e.target.value || null)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700"
              >
                <option value="">Default config</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSidebarTab("profiles")}
                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
              >
                Manage profiles →
              </button>
            </div>

            {/* Run button */}
            <button
              onClick={() => void handleRun()}
              disabled={!selectedDoc || stream.status === "running"}
              className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {stream.status === "running" ? "Running..." : "Run Analysis"}
            </button>
            {stream.status === "running" && (
              <button
                onClick={stream.stop}
                className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        )}

        {sidebarTab === "history" && (
          <div className="p-4">
            <h2 className="font-semibold text-gray-900 mb-2">Evaluation History</h2>
            <p className="text-xs text-gray-500">
              Past agentic analysis runs are shown in the main panel.
            </p>
          </div>
        )}

        {sidebarTab === "profiles" && (
          <ProfilesList
            profiles={profiles as Profile[]}
            loading={profilesLoading}
            selectedProfile={selectedProfileForEdit}
            onSelectProfile={(p) => setSelectedProfileForEdit(p)}
            onCreateProfile={() => void handleCreateProfile()}
            onDeleteProfile={(id) => void handleDeleteProfile(id)}
            onSetDefault={(id) => void setDefaultProfile(id)}
            onRenameProfile={(id, name) => void handleRenameProfile(id, name)}
            onDuplicateProfile={(p) => void handleDuplicateProfile(p)}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {sidebarTab === "history" ? (
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <EvaluationsList
              evaluations={evaluations}
              loading={evalsLoading}
              error={evalsError}
              onRefresh={() => void refreshEvals()}
            />
          </div>
        ) : sidebarTab === "profiles" ? (
          selectedProfileForEdit ? (
            <div className="flex-1 overflow-y-auto">
              <div className="border-b border-gray-200 bg-white px-4 py-3">
                <h2 className="text-lg font-medium text-gray-900">
                  Profile: {selectedProfileForEdit.name}
                </h2>
              </div>
              <div className="p-4">
                <ProfileEditor
                  config={selectedProfileForEdit.config as never}
                  onSave={handleSaveConfig as never}
                  saving={saving}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <CpuChipIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Select a profile to edit</p>
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
        ) : (
          <>
            {/* Run tab - show activity and results */}
            {showEditor && activeProfile && (
              <div className="border-b border-gray-200 bg-white">
                <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-gray-700">
                    Profile: {activeProfile.name}
                  </h2>
                </div>
                <ProfileEditor
                  config={activeProfile.config as never}
                  onSave={handleSaveConfig as never}
                  saving={saving}
                />
              </div>
            )}

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 bg-gray-50 overflow-hidden">
              <div className="border border-gray-200 rounded-lg bg-white overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-sm font-medium text-gray-700">Activity Feed</h2>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <ActivityFeed events={stream.events} />
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg bg-white overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-sm font-medium text-gray-700">Results</h2>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <ResultsPanel
                    status={stream.status}
                    result={stream.result}
                    error={stream.error}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showPicker && (
        <DocumentPickerModal
          onSelect={(doc) => {
            setSelectedDoc({ id: doc.id, title: doc.title });
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
