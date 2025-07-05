"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

const PUBLIC_PATHS = [
  '/auth/signin',
  '/signup',
  '/welcome',
  '/api',
  '/settings/profile',
];

export default function ProfileCheck() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip if loading or on public paths
    if (status === "loading" || PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
      return;
    }

    // If user is logged in but has no name, redirect to welcome
    if (session?.user && !session.user.name && pathname !== '/welcome') {
      router.replace('/welcome');
    }
  }, [session, status, pathname, router]);

  return null;
}