"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface WelcomeFormProps {
  userEmail: string;
  userName: string | null;
}

export default function WelcomeForm({ userEmail, userName }: WelcomeFormProps) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // If user already has a name, redirect to home
  useEffect(() => {
    if (userName) {
      router.push("/");
    }
  }, [userName, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Get stored preferences from sessionStorage
      const storedPreferences = sessionStorage.getItem('signupPreferences');
      const preferences = storedPreferences ? JSON.parse(storedPreferences) : null;

      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name,
          preferences: preferences ? {
            agreedToTerms: preferences.agreedToTerms,
            researchUpdates: preferences.researchUpdates,
            quriUpdates: preferences.quriUpdates
          } : undefined
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update profile");
      }

      // Clear stored preferences
      sessionStorage.removeItem('signupPreferences');

      // Force a session refresh by reloading the page
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={userEmail}
          disabled
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Your name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="John Doe"
          disabled={isLoading}
          autoFocus
        />
        <p className="mt-1 text-sm text-gray-500">
          This is how you'll appear on your documents and evaluations
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? "Saving..." : "Complete setup"}
        </button>
      </div>

      <div className="text-sm text-center">
        <a 
          href="/settings/profile" 
          className="text-gray-500 hover:text-gray-700"
        >
          Skip for now
        </a>
      </div>
    </form>
  );
}