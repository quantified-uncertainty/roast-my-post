"use client";

import { User, Pencil } from "lucide-react";
import { logger } from "@/lib/logger";
import Link from "next/link";
import { useState, useEffect } from "react";

import { Button } from "@/components/Button";
import type { User as UserType } from "@/models/User";
import { USER_DISPLAY } from "@/lib/constants";

interface UserDetailProps {
  user: UserType;
}

export default function UserDetail({ user }: UserDetailProps) {
  const [documentsCount, setDocumentsCount] = useState<number | null>(null);
  const [agentsCount, setAgentsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserStats() {
      try {
        // We'd implement these API endpoints later
        const [docsResponse, agentsResponse] = await Promise.all([
          fetch(`/api/users/${user.id}/documents/count`).then((res) =>
            res.json()
          ),
          fetch(`/api/users/${user.id}/agents/count`).then((res) => res.json()),
        ]);

        setDocumentsCount(docsResponse.count);
        setAgentsCount(agentsResponse.count);
      } catch (error) {
        logger.error('Error fetching user stats:', error);
        // Set defaults in case API is not yet available
        setDocumentsCount(0);
        setAgentsCount(0);
      } finally {
        setLoading(false);
      }
    }

    fetchUserStats();
  }, [user.id]);

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-blue-100 p-3">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {user.name || USER_DISPLAY.GUEST_NAME}
            </h2>
            {user.email && (
              <p className="text-sm text-gray-500">
                {user.email}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user.isCurrentUser && (
            <Link href={`/users/${user.id}/edit`}>
              <Button variant="secondary" className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Link href={`/users/${user.id}/documents`} className="block">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
            <h3 className="mb-2 text-lg font-medium">Documents</h3>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <p className="text-3xl font-bold">{documentsCount}</p>
            )}
            <p className="mt-2 text-sm text-gray-500">
              Documents created by this user
            </p>
            <p className="mt-3 text-sm font-medium text-blue-600">
              View all →
            </p>
          </div>
        </Link>

        <Link href={`/users/${user.id}/agents`} className="block">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
            <h3 className="mb-2 text-lg font-medium">Agents</h3>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <p className="text-3xl font-bold">{agentsCount}</p>
            )}
            <p className="mt-2 text-sm text-gray-500">
              Agents created by this user
            </p>
            <p className="mt-3 text-sm font-medium text-blue-600">
              View all →
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
