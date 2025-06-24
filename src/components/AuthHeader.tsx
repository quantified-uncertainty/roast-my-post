"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function AuthHeader() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  return (
    <>
      {isLoading ? (
        <span className="text-white opacity-70">Loading...</span>
      ) : session ? (
        <>
          <Link
            href={`/users/${session.user?.id}`}
            className="mr-4 text-white opacity-70 hover:underline"
          >
            {session.user?.name || session.user?.email}
          </Link>
          <Link
            href="/settings/keys"
            className="mr-4 text-white opacity-70 hover:underline"
          >
            Settings
          </Link>
          <Link
            href="/api/auth/signout"
            className="text-white hover:text-gray-200"
          >
            Log Out
          </Link>
        </>
      ) : (
        <Link
          href="/api/auth/signin"
          className="text-white hover:text-gray-200"
        >
          Log In
        </Link>
      )}
    </>
  );
}
