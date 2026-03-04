"use client";

import { useState, useEffect } from "react";

interface FallacyCheckProfile {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
}

interface UseFallacyCheckProfilesReturn {
  profiles: FallacyCheckProfile[];
  loading: boolean;
  error: string | null;
  defaultProfileId: string | null;
}

/**
 * Fetch fallacy-check profiles for use in the agentic config UI.
 * Uses a fixed agentId since we want all available fallacy-check profiles.
 */
export function useFallacyCheckProfiles(agentId = "system-fallacy-check"): UseFallacyCheckProfilesReturn {
  const [profiles, setProfiles] = useState<FallacyCheckProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const res = await fetch(
          `/api/monitor/lab/profiles?agentId=${agentId}&pluginType=fallacy-check`
        );
        if (!res.ok) throw new Error("Failed to fetch profiles");
        const data = await res.json();
        setProfiles(data.profiles);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    void fetchProfiles();
  }, [agentId]);

  const defaultProfileId = profiles.find((p) => p.isDefault)?.id ?? null;

  return { profiles, loading, error, defaultProfileId };
}
