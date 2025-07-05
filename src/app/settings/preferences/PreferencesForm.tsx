"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserPreferences } from "@prisma/client";

interface PreferencesFormProps {
  userId: string;
  preferences: UserPreferences | null;
}

export default function PreferencesForm({ userId, preferences }: PreferencesFormProps) {
  const [researchUpdates, setResearchUpdates] = useState(preferences?.researchUpdates ?? false);
  const [quriUpdates, setQuriUpdates] = useState(preferences?.quriUpdates ?? false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researchUpdates,
          quriUpdates,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update preferences");
      }

      setIsSaved(true);
      router.refresh();
      
      // Hide success message after 3 seconds
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error('Error updating preferences:', error);
      alert("Failed to update preferences. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-start">
          <input
            id="research"
            name="research"
            type="checkbox"
            checked={researchUpdates}
            onChange={(e) => setResearchUpdates(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
          />
          <label htmlFor="research" className="ml-3 block text-sm font-medium text-gray-700">
            RoastMyPost updates
            <p className="text-gray-500 text-sm font-normal">
              Receive updates about new features, research insights, and improvements to RoastMyPost
            </p>
          </label>
        </div>

        <div className="flex items-start">
          <input
            id="quri"
            name="quri"
            type="checkbox"
            checked={quriUpdates}
            onChange={(e) => setQuriUpdates(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
          />
          <label htmlFor="quri" className="ml-3 block text-sm font-medium text-gray-700">
            QURI updates
            <p className="text-gray-500 text-sm font-normal">
              Receive updates from the Quantified Uncertainty Research Institute about our research and projects
            </p>
          </label>
        </div>
      </div>

      {preferences?.agreedToTerms && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">
            You agreed to our Terms of Service on{" "}
            <span className="font-medium">
              {new Date(preferences.agreedToTermsAt!).toLocaleDateString()}
            </span>
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Saving..." : "Save preferences"}
        </button>
        {isSaved && (
          <span className="text-sm text-green-600">
            Preferences saved successfully!
          </span>
        )}
      </div>
    </form>
  );
}