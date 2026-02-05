"use client";

import { useState } from "react";
import { useAgenticStream } from "./hooks/useAgenticStream";
import { useProfiles, getActiveProfile } from "../lab/hooks/useProfiles";
import { ActivityFeed } from "./components/ActivityFeed";
import { ResultsPanel } from "./components/ResultsPanel";
import { DocumentPickerModal } from "./components/DocumentPickerModal";
import { ProfileEditor } from "./components/ProfileEditor";

interface SelectedDoc {
  id: string;
  title: string;
}

export default function AgenticPage() {
  const [selectedDoc, setSelectedDoc] = useState<SelectedDoc | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const stream = useAgenticStream();
  const { profiles, createProfile, updateProfile, deleteProfile } = useProfiles("system-agentic", "agentic");

  const activeProfile = getActiveProfile(profiles, selectedProfileId);

  const handleRun = () => {
    if (!selectedDoc) return;
    stream.start(selectedDoc.id, activeProfile?.id);
  };

  const handleCreateProfile = async () => {
    try {
      const profile = await createProfile(
        `Profile ${new Date().toLocaleString()}`,
        "Agentic analysis profile"
      );
      setSelectedProfileId(profile.id);
      setShowEditor(true);
    } catch (err) {
      console.error("Failed to create profile:", err);
    }
  };

  const handleSaveConfig = async (config: Record<string, unknown>) => {
    if (!activeProfile) return;
    setSaving(true);
    try {
      await updateProfile(activeProfile.id, { config } as never);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!activeProfile) return;
    if (!confirm(`Delete profile "${activeProfile.name}"?`)) return;
    try {
      await deleteProfile(activeProfile.id);
      setSelectedProfileId(null);
      setShowEditor(false);
    } catch (err) {
      console.error("Failed to delete profile:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowPicker(true)}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {selectedDoc ? selectedDoc.title : "Select Document..."}
        </button>
        {selectedDoc && (
          <button
            onClick={() => setSelectedDoc(null)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Clear
          </button>
        )}

        {/* Profile selector */}
        <div className="flex items-center gap-1">
          <select
            value={activeProfile?.id ?? ""}
            onChange={(e) => setSelectedProfileId(e.target.value || null)}
            className="border border-gray-300 rounded-md px-2 py-2 text-sm text-gray-700"
          >
            <option value="">Default config</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreateProfile}
            className="px-2 py-2 text-xs text-blue-600 hover:text-blue-800"
            title="New profile"
          >
            + New
          </button>
          {activeProfile && (
            <>
              <button
                onClick={() => setShowEditor((v) => !v)}
                className="px-2 py-2 text-xs text-gray-500 hover:text-gray-700"
              >
                {showEditor ? "Hide" : "Edit"}
              </button>
              <button
                onClick={handleDeleteProfile}
                className="px-2 py-2 text-xs text-red-500 hover:text-red-700"
                title="Delete profile"
              >
                Del
              </button>
            </>
          )}
        </div>

        <button
          onClick={handleRun}
          disabled={!selectedDoc || stream.status === "running"}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {stream.status === "running" ? "Running..." : "Run Analysis"}
        </button>
        {stream.status === "running" && (
          <button
            onClick={stream.stop}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
          >
            Stop
          </button>
        )}
      </div>

      {/* Collapsible profile editor */}
      {showEditor && activeProfile && (
        <div className="border border-gray-200 rounded-lg bg-white">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ minHeight: "500px" }}>
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-medium text-gray-700">Activity Feed</h2>
          </div>
          <div className="flex-1 min-h-0" style={{ maxHeight: "600px" }}>
            <ActivityFeed events={stream.events} />
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-medium text-gray-700">Results</h2>
          </div>
          <div className="flex-1 min-h-0" style={{ maxHeight: "600px" }}>
            <ResultsPanel
              status={stream.status}
              result={stream.result}
              error={stream.error}
            />
          </div>
        </div>
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
