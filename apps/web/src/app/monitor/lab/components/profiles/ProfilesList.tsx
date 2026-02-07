"use client";

import { useState } from "react";
import { PlusIcon, TrashIcon, CheckCircleIcon, PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { Profile } from "../../types";
import { formatDate } from "../../utils/formatters";

interface ProfilesListProps {
  profiles: Profile[];
  loading: boolean;
  selectedProfile: Profile | null;
  onSelectProfile: (profile: Profile) => void;
  onCreateProfile: () => void;
  onDeleteProfile: (id: string) => void;
  onSetDefault: (id: string) => void;
  onRenameProfile?: (id: string, newName: string) => void;
}

export function ProfilesList({
  profiles,
  loading,
  selectedProfile,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
  onSetDefault,
  onRenameProfile,
}: ProfilesListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleDelete = (e: React.MouseEvent, profile: Profile) => {
    e.stopPropagation();
    if (profile.isDefault) {
      alert("Cannot delete the default profile. Set another profile as default first.");
      return;
    }
    if (!confirm(`Delete profile "${profile.name}"?`)) return;
    onDeleteProfile(profile.id);
  };

  const handleSetDefault = (e: React.MouseEvent, profile: Profile) => {
    e.stopPropagation();
    if (profile.isDefault) return;
    onSetDefault(profile.id);
  };

  const handleStartRename = (e: React.MouseEvent, profile: Profile) => {
    e.stopPropagation();
    setEditingId(profile.id);
    setEditingName(profile.name);
  };

  const handleSaveRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingId && editingName.trim() && onRenameProfile) {
      onRenameProfile(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName("");
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditingName("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-900">Profiles</h2>
          <button
            onClick={onCreateProfile}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="Create profile"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500">Configure analysis settings for different use cases</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-gray-500 text-sm">Loading...</div>
        ) : profiles.length === 0 ? (
          <div className="p-4 text-gray-500 text-sm">
            <p>No profiles yet</p>
            <button
              onClick={onCreateProfile}
              className="mt-2 text-blue-600 hover:underline text-sm"
            >
              Create your first profile
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => editingId !== profile.id && onSelectProfile(profile)}
                className={`p-3 cursor-pointer hover:bg-gray-100 ${
                  selectedProfile?.id === profile.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {editingId === profile.id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(e as unknown as React.MouseEvent);
                              if (e.key === "Escape") handleCancelRename(e as unknown as React.MouseEvent);
                            }}
                            className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveRename}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Save"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancelRename}
                            className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                            title="Cancel"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-gray-900 truncate">{profile.name}</span>
                          {profile.isDefault && (
                            <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                              Default
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {editingId !== profile.id && profile.description && (
                      <div className="text-xs text-gray-500 mt-1 truncate">{profile.description}</div>
                    )}
                    {editingId !== profile.id && (
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(profile.updatedAt)}
                      </div>
                    )}
                  </div>
                  {editingId !== profile.id && (
                    <div className="flex items-center gap-1 ml-2">
                      {onRenameProfile && (
                        <button
                          onClick={(e) => handleStartRename(e, profile)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Rename profile"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                      {!profile.isDefault && (
                        <button
                          onClick={(e) => handleSetDefault(e, profile)}
                          className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                          title="Set as default"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(e, profile)}
                        className={`p-1 rounded ${
                          profile.isDefault
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                        }`}
                        disabled={profile.isDefault}
                        title={profile.isDefault ? "Cannot delete default profile" : "Delete profile"}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
