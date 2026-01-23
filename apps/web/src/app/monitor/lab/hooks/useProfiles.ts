import { useState, useCallback, useEffect } from "react";
import type { Profile, ProfileConfig } from "../types";

interface UseProfilesReturn {
  profiles: Profile[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createProfile: (name: string, description: string, config?: Partial<ProfileConfig>) => Promise<Profile>;
  updateProfile: (id: string, updates: Partial<Profile>) => Promise<Profile>;
  deleteProfile: (id: string) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
}

export function useProfiles(agentId: string): UseProfilesReturn {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/monitor/lab/profiles?agentId=${agentId}`);
      if (!res.ok) throw new Error("Failed to fetch profiles");
      const data = await res.json();
      setProfiles(data.profiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createProfile = useCallback(
    async (name: string, description: string, config?: Partial<ProfileConfig>): Promise<Profile> => {
      const res = await fetch("/api/monitor/lab/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, agentId, config }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create profile");
      }
      const data = await res.json();
      await refresh();
      return data.profile;
    },
    [agentId, refresh]
  );

  const updateProfile = useCallback(
    async (id: string, updates: Partial<Profile>): Promise<Profile> => {
      const res = await fetch(`/api/monitor/lab/profiles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }
      const data = await res.json();
      await refresh();
      return data.profile;
    },
    [refresh]
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/monitor/lab/profiles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete profile");
      await refresh();
    },
    [refresh]
  );

  const setDefault = useCallback(
    async (id: string) => {
      await updateProfile(id, { isDefault: true } as Partial<Profile>);
    },
    [updateProfile]
  );

  return { profiles, loading, error, refresh, createProfile, updateProfile, deleteProfile, setDefault };
}

/**
 * Get the default profile or the first one available
 */
export function getActiveProfile(profiles: Profile[], selectedId: string | null): Profile | null {
  if (selectedId) {
    const selected = profiles.find(p => p.id === selectedId);
    if (selected) return selected;
  }

  // Find default profile
  const defaultProfile = profiles.find(p => p.isDefault);
  if (defaultProfile) return defaultProfile;

  // Fall back to first profile
  return profiles[0] ?? null;
}
