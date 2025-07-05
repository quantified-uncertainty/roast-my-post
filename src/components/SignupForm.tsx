"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [researchUpdates, setResearchUpdates] = useState(false);
  const [quriUpdates, setQuriUpdates] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate terms agreement
    if (!agreedToTerms) {
      setError("You must agree to the terms of service to continue");
      return;
    }
    
    setIsLoading(true);

    try {
      // Check if user already exists
      const checkResponse = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const checkData = await checkResponse.json();

      if (checkData.exists) {
        setError("An account with this email already exists. Please sign in instead.");
        setIsLoading(false);
        return;
      }

      // Store preferences temporarily
      sessionStorage.setItem('signupPreferences', JSON.stringify({
        agreedToTerms,
        researchUpdates,
        quriUpdates,
        timestamp: Date.now()
      }));

      // Use NextAuth's signIn to send magic link
      const { signIn } = await import("next-auth/react");
      await signIn("resend", {
        email,
        redirect: false,
        callbackUrl: "/welcome", // Redirect to welcome page after first login
      });

      // Redirect to success page
      router.push("/signup/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
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
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="john@example.com"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-start">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
            disabled={isLoading}
          />
          <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
            I agree to the{" "}
            <a href="/terms" target="_blank" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </a>
            <span className="text-red-500 ml-1">*</span>
          </label>
        </div>

        <div className="flex items-start">
          <input
            id="research"
            name="research"
            type="checkbox"
            checked={researchUpdates}
            onChange={(e) => setResearchUpdates(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
            disabled={isLoading}
          />
          <label htmlFor="research" className="ml-2 block text-sm text-gray-700">
            Send me updates about RoastMyPost research and new features
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
            disabled={isLoading}
          />
          <label htmlFor="quri" className="ml-2 block text-sm text-gray-700">
            Send me updates from QURI (Quantified Uncertainty Research Institute)
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creating account..." : "Sign up"}
        </button>
      </div>

      <div className="text-sm text-center">
        <span className="text-gray-600">Already have an account? </span>
        <a href="/api/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
          Log in
        </a>
      </div>
    </form>
  );
}