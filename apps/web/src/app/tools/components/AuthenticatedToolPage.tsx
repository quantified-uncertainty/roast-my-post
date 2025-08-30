'use client';

import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LockClosedIcon } from '@heroicons/react/24/outline';

interface AuthenticatedToolPageProps {
  children: ReactNode;
  toolName?: string;
  requireAuth?: boolean;
}

/**
 * Wrapper component that ensures user is authenticated before showing tool content.
 * Shows a login prompt for unauthenticated users.
 */
export function AuthenticatedToolPage({ 
  children, 
  toolName = 'this tool',
  requireAuth = true 
}: AuthenticatedToolPageProps) {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const isAuthenticated = !!session?.user;

  // If auth is not required, just render children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="mb-6">
            <LockClosedIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600">
              You need to be logged in to use {toolName}.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/api/auth/signin">Sign In</Link>
            </Button>
            
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link href="/signup" className="text-indigo-600 hover:text-indigo-500 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated, render the tool content
  return <>{children}</>;
}