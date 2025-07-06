"use client";

import { User } from "lucide-react";
import Link from "next/link";

import type { User as UserType } from "@/models/User";
import { USER_DISPLAY } from "@/lib/constants";

interface UsersClientProps {
  users: UserType[];
}

export default function UsersClient({ users }: UsersClientProps) {
  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="mb-2 text-3xl font-bold">Users</h1>
      <p className="mb-8 text-gray-600">All registered users in the system.</p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Link
            key={user.id}
            href={`/users/${user.id}`}
            className="group block"
          >
            <div className="h-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="mb-2 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold transition-colors group-hover:text-blue-600">
                    {user.name || USER_DISPLAY.GUEST_NAME}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {user.email || "No email provided"}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
