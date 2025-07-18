"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { UserIcon } from "@heroicons/react/24/outline";

export default function AuthHeader() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {isLoading ? (
        <span className="text-gray-500">Loading...</span>
      ) : session ? (
        <>
          {session.user && !session.user.name && (
            <Link
              href="/welcome"
              className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md hover:bg-yellow-200 transition-colors"
            >
              Complete profile
            </Link>
          )}
          <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            <UserIcon className="w-5 h-5 text-gray-600" />
          </button>
          
          {isOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
              <Link
                href={`/users/${session.user?.id}`}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsOpen(false)}
              >
                My page
              </Link>
              <Link
                href="/experiments"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsOpen(false)}
              >
                My experiments
              </Link>
              <Link
                href="/settings/keys"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsOpen(false)}
              >
                Settings
              </Link>
              <Link
                href="/api/auth/signout"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsOpen(false)}
              >
                Log Out
              </Link>
            </div>
          )}
        </div>
        </>
      ) : (
        <div className="flex items-center space-x-4">
          <Link
            href="/api/auth/signin"
            className="text-gray-600 hover:text-gray-900"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Sign Up
          </Link>
        </div>
      )}
    </>
  );
}
