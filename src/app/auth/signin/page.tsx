"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Suspense } from "react";

// Common form input styles
const inputClassName = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
const buttonClassName = "w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const email = searchParams.get("email") || "";
  const autoSubmit = searchParams.get("autoSubmit") === "true";
  const [isLoading, setIsLoading] = useState(false);
  const [emailInput, setEmailInput] = useState(email);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);

  useEffect(() => {
    // Auto-submit if coming from signup
    if (autoSubmit && email && !hasAutoSubmitted) {
      setHasAutoSubmitted(true);
      handleSubmit();
    }
  }, [autoSubmit, email, hasAutoSubmitted, handleSubmit]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!emailInput) return;

    setIsLoading(true);
    try {
      await signIn("resend", {
        email: emailInput,
        callbackUrl,
        redirect: false,
      });
      // Redirect to success page
      window.location.href = "/signup/success";
    } catch (error) {
      console.error("Sign in error:", error);
      setIsLoading(false);
    }
  }, [emailInput, callbackUrl]);

  // Show loading state when auto-submitting from signup
  if (autoSubmit && (isLoading || hasAutoSubmitted)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
              <svg className="h-6 w-6 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Completing your signup...</h2>
          <p className="text-gray-600 mb-4">We're sending you a magic link to {email}</p>
          <p className="text-sm text-gray-500">This will just take a moment.</p>
        </div>
      </div>
    );
  }

  // Determine if this is a signup flow
  const isSignupFlow = autoSubmit && email;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isSignupFlow ? "Complete your signup" : "Sign in to your account"}
          </h2>
          {isSignupFlow && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Click the button below to receive your magic link
            </p>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className={inputClassName}
              placeholder="Enter your email"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={buttonClassName}
            >
              {isLoading ? "Sending..." : isSignupFlow ? "Send magic link" : "Sign in with Email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  );
}